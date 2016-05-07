var app = angular.module('orderchef');

app.service('BillsService', function ($http) {
	var self = this;
	this.payment_methods = [];
	this.bill_items = [];

	$http.get('/config/payment-methods').success(function (pm) {
		self.payment_methods = pm;
	});

	$http.get('/config/bill-items').success(function (items) {
		self.bill_items = items;
	});

	this.getTotals = function (group, cb, cache) {
		if (cache !== true) cache = false;

		if (self.payment_methods.length == 0) {
			$http.get('/config/payment-methods').success(function (pm) {
				self.payment_methods = pm;
				self._getTotals(group, cb, cache);
			});
		} else {
			self._getTotals(group, cb, cache);
		}
	}

	this.lastTotals = null;
	this._getTotals = function (group, cb, cache) {
		if (cache && self.lastTotals != null && self.lastTotals.group_id == group.id) return cb(self.lastTotals);

		$http.get('/order-group/' + group.id + '/bills/totals').success(function (totals) {
			self.payment_methods.forEach(function (p) {
				p.amount = 0;

				for (var i = 0; i < totals.paid.length; i++) {
					if (totals.paid[i].payment_method_id == p.id) {
						p.amount += totals.paid[i].paid_amount;
					}
				}

				p.amountFormatted = (Math.round(p.amount * 100) / 100).toFixed(2)
			});

			var totalPaid = 0;
			for (var i = 0; i < totals.paid.length; i++) {
				totalPaid += totals.paid[i].paid_amount;
			}

			totals.group_id = group.id;
			totals.paidTotal = Math.round(totalPaid * 100) / 100;
			totals.paidFormatted = totals.paidTotal.toFixed(2);
			totals.total = Math.round(totals.total * 100) / 100;
			totals.totalFormatted = totals.total.toFixed(2);
			totals.leftPay = Math.round((totals.total - totals.paidTotal) * 100) / 100;
			totals.leftPayFormatted = totals.leftPay.toFixed(2)
			self.lastTotals = totals;

			cb(totals);
		});
	}

	return this;
});

var deps = ['$scope', '$http', 'dataMatcher', '$ionicPopup', '$state', '$rootScope', 'BillsService', '$ionicHistory'];
if (!window.oc_info.is_ipad) deps.push('OrderGroup');
deps.push(OrderBillsCtrl);

app.controller('OrderBillsCtrl', deps);

function OrderBillsCtrl ($scope, $http, dataMatcher, $ionicPopup, $state, $rootScope, BillsService, $ionicHistory, OrderGroup) {
	if (!window.oc_info.is_ipad) {
		$scope.group = OrderGroup;
	}

	$scope.bill = null;
	$scope.amountItem = {};
	$scope.orderItems = [];
	$scope.paid = [];
	$scope.totals = {};

	$scope.BillsService = BillsService;
	BillsService.getTotals($scope.group, function (totals) {
		$scope.totals = totals;
	});

	$http.get('/config/payment-methods').success(function (pm) {
		$scope.payment_methods = pm;
	});

	$scope.refresh = function () {
		$http.get('/order-group/' + $scope.group.id + '/bills').success(function (bills) {
			if (bills.length == 0) {
				$http.post('/order-group/' + $scope.group.id + '/bills').success(function (bill) {
					$scope.bill = bill;
					for (var i = 0; i < $scope.payment_methods.length; i++) {
						$scope.paid.push({
							payment_method_id: $scope.payment_methods[i].id,
							bill_id: $scope.bill.id,
							amount: 0,
							name: $scope.payment_methods[i].name
						});
					}

					$scope.formatTotal();
					$scope.formatPaidTotal();
					$scope.refreshBillItems();
				});

				return;
			}

			$scope.bill = bills[0];
			var hasServiceCharge = false;
			var serviceChargeItem = null;
			for (var i = 0; i < BillsService.bill_items.length; i++) {
				var bi = BillsService.bill_items[i];
				bi.quantity = 0;

				for (var x = 0; x < $scope.bill.bill_extras.length; x++) {
					if (bi.id == $scope.bill.bill_extras[x].bill_item_id) {
						bi.quantity = $scope.bill.bill_extras[x].quantity;
					}
				}

				if (bi.name.toLowerCase().indexOf('service charge') > -1) {
					hasServiceCharge = bi.quantity > 0;
					serviceChargeItem = bi;
				}
			}

			if (!hasServiceCharge && $scope.group.covers >= 5) {
				// add service charge
				serviceChargeItem.quantity = 1;
				$http.put('/order-group/' + $scope.group.id + '/bill/' + $scope.bill.id + '/extras/' + serviceChargeItem.id, {
					quantity: 1,
					bill_item_id: serviceChargeItem.id
				}).success(function () {
					BillsService.getTotals($scope.group, function (totals) {
						$scope.totals = totals;
						$scope.formatPaidTotal();
					});
				});
			}

			$http.get('/order-group/' + $scope.group.id + '/bill/' + $scope.bill.id + '/payment').success(function (payments) {
				$scope.paid = payments;
				for (var i = 0; i < $scope.payment_methods.length; i++) {
					var found = null;
					for (var x = 0; x < $scope.paid.length; x++) {
						if ($scope.paid[x].payment_method_id == $scope.payment_methods[i].id) {
							found = x;
							break;
						}
					}

					if (found === null) {
						$scope.paid.push({
							payment_method_id: $scope.payment_methods[i].id,
							bill_id: $scope.bill.id,
							amount: 0,
							name: $scope.payment_methods[i].name
						});
					} else {
						$scope.paid[found].name = $scope.payment_methods[i].name;
					}
				}

				$scope.formatPaidTotal();
			});
			$scope.formatTotal();
			$scope.refreshBillItems();

			if (bills.length > 1) {
				for (var i = 1; i < bills.length; i++) {
					$http.delete('/order-group/' + $scope.group.id + '/bill/' + bills[i].id);
				}
			}
		});
	}

	$scope.clearTable = function () {
		$http.post('/order-group/' + $scope.group.id + '/clear').success(function () {
			if (window.oc_info.is_ipad) {
				$scope.hideModal();
				$rootScope.$emit('tables.reload');
				$rootScope.$emit('orders.clearTable');
			} else {
				$ionicHistory.goBack(-2);
			}
		}).error(function () {
			$ionicPopup.alert({
				title: 'Could not clear table.'
			})
		});
	}

	$scope.formatTotal = function () {
		if (!$scope.bill.total) {
			$scope.bill.totalFormatted = "0";
			return;
		}

		$scope.bill.totalFormatted = (Math.round($scope.bill.total * 100) / 100).toFixed(2)
	}

	$scope.formatPaidTotal = function () {
		var total = 0;
		for (var i = 0; i < $scope.paid.length; i++) {
			total += $scope.paid[i].amount;
		}

		$scope.totals.paid = total;
		$scope.totals.paidTotal = Math.round(total * 100) / 100;
		$scope.totals.paidFormatted = $scope.totals.paidTotal.toFixed(2);
		$scope.totals.leftPay = Math.round(($scope.totals.total - $scope.totals.paidTotal) * 100) / 100;
		$scope.totals.leftPayFormatted = $scope.totals.leftPay.toFixed(2)
	}

	$scope.setAmountForPaymentMethod = function (pm) {
		var amountTotal = 0;
		for (var i = 0; i < $scope.paid.length; i++) {
			if ($scope.paid[i].amount > 0) {
				amountTotal += $scope.paid[i].amount;
			}
		}

		if ($scope.totals.total - amountTotal <= 0) return;

		pm.amount = $scope.totals.total - amountTotal;
		$scope.formatPaidTotal();
	}

	$scope.setBillExtraQuantity = function (item, quantity) {
		if (quantity <= 0) quantity = 0;
		item.quantity = quantity;

		$http.put('/order-group/' + $scope.group.id + '/bill/' + $scope.bill.id + '/extras/' + item.id, {
			quantity: quantity,
			bill_item_id: item.id
		}).success(function () {
			BillsService.getTotals($scope.group, function (totals) {
				$scope.totals = totals;
				$scope.formatPaidTotal();
			});
		});
	}

	$scope.applyPercentAmount = function (percent) {
		if (percent == 0) {
			var scope = $rootScope.$new();
			scope.data = {};
			return $ionicPopup.show({
				template: '<input type="number" min="1" max="100" placeholder="Enter percentage" ng-model="data.percent">',
				title: 'Enter Custom Bill Percentage',
				subTitle: 'Enter a number, 0-100',
				scope: scope,
				buttons: [{
					text: 'Cancel'
				}, {
					text: '<b>Save</b>',
					type: 'button-positive',
					onTap: function(e) {
						if (!scope.data.percent) {
							e.preventDefault();
						} else {
							return scope.data.percent;
						}
					}
				}]
  		}).then(function(percent) {
  			$scope.bill.total = $scope.totals.leftPay * (percent / 100);
  		});
		}

		$scope.bill.total = $scope.totals.leftPay * (percent / 100);
	}

	$scope.refreshBillItems = function () {
		$http.get('/order-group/' + $scope.group.id + '/orders').success(function (orders) {
			$scope.orderItems = orders;

			$scope.bill.total = 0;
			orders.forEach(function (order) {
				order.type = dataMatcher.getOrderType(order.type_id);

				order.items.forEach(function (orderItem) {
					// for (var i = 0; i < $scope.bill.bill_items)

					orderItem.item = dataMatcher.getItem(orderItem.item_id);
					orderItem.total = orderItem.quantity * orderItem.item.price;

					orderItem.modifiers.forEach(function (modifier) {
						modifier.group = dataMatcher.getModifierGroup(modifier.modifier_group_id);
						modifier.modifier = dataMatcher.getModifier(modifier.modifier_group_id, modifier.modifier_id);
						orderItem.total += orderItem.quantity * modifier.modifier.price;
					});

					$scope.bill.total += orderItem.total;
				});
			});
		});
	}

	$scope.saveBill = function (cb) {
		if (typeof cb != 'function') cb = function(){}

		var selected = [];
		$scope.orderItems.forEach(function (item) {
			for (var i = 0; i < item.items.length; i++) {
				var _item = item.items[i];
				selected.push({
					order_item_id: _item.id,
					item_name: _item.item.name,
					item_price: _item.total,
					discount: 0
				});
			}
		});

		var bill = JSON.parse(JSON.stringify($scope.bill));
		bill.bill_items = selected;

		$http.put('/order-group/' + $scope.group.id + '/bill/' + $scope.bill.id, bill)
		.success(function () {
			async.each($scope.paid, function (pm, cb) {
				if (pm.amount <= 0) return cb();

				$http.put('/order-group/' + $scope.group.id + '/bill/' + $scope.bill.id + '/payment', pm).success(function () {
					cb();
				}).error(function () {
					cb('err');
				});
			}, function (e) {
				if (!e) return cb();

				$ionicPopup.alert({
					title: 'Could not save payment methods'
				});
			});
		}).error(function () {
			$ionicPopup.alert({
				title: 'Could not save bill'
			});
		})
	}

	$scope.printBill = function () {
		$scope.saveBill(function () {
			$http.post('/order-group/' + $scope.group.id + '/bill/' + $scope.bill.id + '/print').success(function () {
				$ionicPopup.alert({
					title: 'Bill Printed!'
				});
			}).error(function (_, statusCode) {
				if (statusCode == 503) {
					$ionicPopup.alert({
						title: 'No Receipt Printers Connected!'
					})
				} else {
					$ionicPopup.alert({
						title: 'Could not print bill'
					});
				}
			});
		})
	}

	$scope.refresh();
}