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
		console.log(self.bill_items);
	});

	this.getTotals = function (OrderGroup, cb, cache) {
		if (cache !== true) cache = false;

		if (self.payment_methods.length == 0) {
			$http.get('/config/payment-methods').success(function (pm) {
				self.payment_methods = pm;
				self._getTotals(OrderGroup, cb, cache);
			});
		} else {
			self._getTotals(OrderGroup, cb, cache);
		}
	}

	this.lastTotals = null;
	this._getTotals = function (OrderGroup, cb, cache) {
		if (cache && self.lastTotals != null && self.lastTotals.group_id == OrderGroup.id) return cb(self.lastTotals);

		$http.get('/order-group/' + OrderGroup.id + '/bills/totals').success(function (totals) {
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

			totals.group_id = OrderGroup.id;
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

app.controller('OrderBillsCtrl', function ($scope, $http, $state, $ionicPopup, OrderGroup, BillsService) {
	$scope.group = OrderGroup;
	$scope.bills = [];

	$scope.BillsService = BillsService;
	BillsService.getTotals(OrderGroup, function (totals) {
		$scope.totals = totals;
	});

	$http.get('/order-group/' + OrderGroup.id + '/bills').success(function (bills) {
		$scope.bills = bills;
	});

	$scope.clearTable = function () {
		$http.post('/order-group/' + OrderGroup.id + '/clear').success(function () {
			$state.go('tables', {}, {
				direction: 'backwards'
			})
		}).error(function () {
			$ionicPopup.alert({
				title: 'Could not clear table.'
			})
		});
	}

	$scope.splitBill = function () {
		if (OrderGroup.covers <= 0) {
			$ionicPopup.alert({
				title: 'No covers'
			});

			return;
		}

		var perCover = $scope.totals.leftPay / OrderGroup.covers;
		if (perCover <= 0) return;

		$http.post('/order-group/' + OrderGroup.id + '/bills/split', {
			covers: OrderGroup.covers,
			perCover: perCover
		}).success(function () {
			BillsService.getTotals(OrderGroup, function (totals) {
				$scope.totals = totals;
			});

			$http.get('/order-group/' + OrderGroup.id + '/bills').success(function (bills) {
				$scope.bills = bills;
			});
		}).error(function () {
			$ionicPopup.alert({
				title: "Could not split bills"
			});
		});
	}
});

app.controller('OrderBillCtrl', function ($scope, $http, OrderGroup, Bill, dataMatcher, $ionicPopup, $state, BillsService, $rootScope) {
	$scope.group = OrderGroup;
	$scope.bill = Bill;
	$scope.amountItem = {};
	$scope.orderItems = [];
	$scope.BillsService = BillsService;

	if (!Bill.id) {
		$scope.newBill = true;
		$http.post('/order-group/' + OrderGroup.id + '/bills').success(function (bill) {
			$scope.bill = bill;

			$scope.formatTotal();
		});
	}

	BillsService.getTotals(OrderGroup, function (totals) {
		$scope.totals = totals;
	}, true);

	$http.get('/config/payment-methods').success(function (pm) {
		$scope.payment_methods = pm;
	});

	$scope.formatTotal = function () {
		if (!$scope.bill.paid_amount) $scope.bill.paid_amount = null;

		if (!$scope.bill.total) {
			$scope.bill.totalFormatted = "0";
			return;
		}

		$scope.bill.totalFormatted = (Math.round($scope.bill.total * 100) / 100).toFixed(2)
	}

	$scope.formatTotal();

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
  			$scope.amountItem.total = $scope.totals.leftPay * (percent / 100);
  		});
		}

		$scope.amountItem.total = $scope.totals.leftPay * (percent / 100);
	}

	$scope.setBillType = function (type) {
		$scope.payFor = type;
		$scope.bill.bill_type = type;

		$scope.refreshBillItems();
	}

	$scope.refreshBillItems = function () {
		if ($scope.bill.bill_type != 'items') {
			if ($scope.bill.bill_items) {
				for (var i = 0; i < $scope.bill.bill_items.length; i++) {
					if ($scope.bill.bill_items[i].order_item_id == null && $scope.bill.bill_items[i].item_name == '-') {
						$scope.amountItem.total = $scope.bill.bill_items[i].item_price;
					}
				}
			}

			return;
		}

		$http.get('/order-group/' + OrderGroup.id + '/orders').success(function (orders) {
			$http.get('/order-group/' + OrderGroup.id + '/bills').success(function (bills) {
				// item ids billed for
				var billedFor = [];
				var toCheck = [];
				bills.forEach(function (bill) {
					if (!bill.bill_items) return;

					for (var i = 0; i < bill.bill_items.length; i++) {
						if (bill.id == $scope.bill.id) {
							toCheck.push(bill.bill_items[i].order_item_id);
						} else {
							billedFor.push(bill.bill_items[i].order_item_id);
						}
					}
				});

				$scope.orderItems = orders;

				orders.forEach(function (order) {
					order.type = dataMatcher.getOrderType(order.type_id);

					order.items.forEach(function (orderItem) {
						orderItem.billedFor = false;
						for (var i = 0; i < billedFor.length; i++) {
							if (billedFor[i] == orderItem.id) {
								orderItem.billedFor = true;
							}
						}

						for (var i = 0; i < toCheck.length; i++) {
							if (toCheck[i] == orderItem.id) {
								orderItem.selected = true;
							}
						}

						// if (!orderItem.billedFor && $scope.newBill) orderItem.selected = true;

						orderItem.item = dataMatcher.getItem(orderItem.item_id);
						orderItem.total = orderItem.quantity * orderItem.item.price;

						orderItem.modifiers.forEach(function (modifier) {
							modifier.group = dataMatcher.getModifierGroup(modifier.modifier_group_id);
							modifier.modifier = dataMatcher.getModifier(modifier.modifier_group_id, modifier.modifier_id);
							orderItem.total += orderItem.quantity * modifier.modifier.price;
						});
					});

					$scope.checkOrderChecked(order);
				});

				$scope.billItemsChanged();
				if ($scope.newBill) $scope.saveBill();
			});
		});
	}
	$scope.refreshBillItems();

	$scope.checkOrderChecked = function (order) {
		order.allChecked = false;
		var numChecked = 0;
		var max = 0;
		for (var i = 0; i < order.items.length; i++) {
			if (!order.items[i].billedFor) max++;
			if (order.items[i].selected) {
				numChecked++;
			}
		}

		order.allChecked = numChecked == max && max > 0;
	}

	$scope.selectAll = function (order) {
		var select = true;
		var numChecked = 0;
		if (order.allChecked == true) select = false;

		for (var i = 0; i < order.items.length; i++) {
			if (order.items[i].billedFor) {
				order.items[i].selected = false;
				continue;
			}

			order.items[i].selected = select;
			numChecked++;
		}

		order.allChecked = select;
		if (numChecked == 0) {
			order.allChecked = 0;
		}
	}

	$scope.billItemsChanged = function () {
		$scope.bill.total = 0;

		$scope.orderItems.forEach(function (order) {
			for (var i = 0; i < order.items.length; i++) {
				if (order.items[i].selected != true) continue;

				$scope.bill.total += order.items[i].total;
			}
		});

		if ($scope.amountItem.total)
			$scope.bill.total += $scope.amountItem.total;

		if (!$scope.$$phase) $scope.$digest();
	}

	$scope.saveBill = function (cb) {
		if (typeof cb != 'function') cb = function(){}
		$scope.billItemsChanged();

		var selected = []
		$scope.orderItems.forEach(function (item) {
			for (var i = 0; i < item.items.length; i++) {
				if (item.items[i].selected == true) {
					var _item = item.items[i];
					selected.push({
						order_item_id: _item.id,
						item_name: _item.item.name,
						item_price: _item.total,
						discount: 0
					});
				}
			}
		});

		if ($scope.bill.bill_type == 'amount') {
			selected.push({
				order_item_id: null,
				item_name: '-',
				item_price: $scope.amountItem.total,
				discount: 0
			});
		}

		var bill = JSON.parse(JSON.stringify($scope.bill));
		if (!bill.paid_amount) bill.paid_amount = 0;
		bill.bill_items = selected;
		bill.payment_method_id = parseInt(bill.payment_method_id) || 0;

		$http.put('/order-group/' + $scope.group.id + '/bill/' + $scope.bill.id, bill)
		.success(function () {
			cb();
		}).error(function () {
			$ionicPopup.alert({
				title: 'Could not save bill'
			});
		})
	}

	$scope.markAsPaid = function () {
		$scope.bill.paid_amount = $scope.bill.total;
		$scope.saveBill(function () {
			$state.transitionTo('orderBills', {
				group_id: $state.params.group_id
			});
		});
	}

	$scope.printBill = function () {
		$http.post('/order-group/' + $scope.group.id + '/bill/' + $scope.bill.id + '/print').success(function () {
			$http.get('/order-group/' + $scope.group.id + '/bill/' + $scope.bill.id).success(function (bill) {
				$scope.bill = bill;
				$scope.formatTotal();
				$ionicPopup.alert({
					title: 'Bill Printed!'
				});
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
	}

	$scope.deleteBill = function () {
		$http.delete('/order-group/' + $scope.group.id + '/bill/' + $scope.bill.id).success(function () {
			$state.transitionTo('orderBills', {
				group_id: $state.params.group_id
			});
		}).error(function () {
			$ionicPopup.alert({
				title: 'Bill could not be deleted'
			});
		});
	}

	$scope.setBillAmount = function () {
		$scope.amountItem.total = $scope.totals.leftPay;
	}
});