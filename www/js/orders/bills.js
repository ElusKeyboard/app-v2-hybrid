var app = angular.module('orderchef');

app.controller('OrderBillsCtrl', function ($scope, $http, OrderGroup) {
	$scope.group = OrderGroup;
	$scope.bills = [];

	$http.get('/config/payment-methods').success(function (pm) {
		$scope.payment_methods = pm;

		$http.get('/order-group/' + OrderGroup.id + '/bills/totals').success(function (totals) {
			pm.forEach(function (p) {
				p.amount = 0;

				for (var i = 0; i < totals.paid.length; i++) {
					if (totals.paid[i].payment_method_id == p.id) {
						p.amount += totals.paid[i].paid_amount;
					}
				}

				p.amountFormatted = (Math.round(p.amount * 100) / 100).toFixed(2)
			});

			$scope.totals = totals;
		});
	});

	$http.get('/order-group/' + OrderGroup.id + '/bills').success(function (bills) {
		$scope.bills = bills;
	});

});

app.controller('OrderBillCtrl', function ($scope, $http, OrderGroup, Bill, dataMatcher, $ionicPopup, $state) {
	$scope.group = OrderGroup;
	$scope.bill = Bill;

	if (!Bill.id) {
		$scope.newBill = true;
		$http.post('/order-group/' + OrderGroup.id + '/bills').success(function (bill) {
			$scope.bill = bill;

			$scope.formatTotal();
		});
	}

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

					if (!orderItem.billedFor && $scope.newBill) orderItem.selected = true;

					orderItem.item = dataMatcher.getItem(orderItem.item_id);
					orderItem.total = orderItem.item.price;

					orderItem.modifiers.forEach(function (modifier) {
						modifier.group = dataMatcher.getModifierGroup(modifier.modifier_group_id);
						modifier.modifier = dataMatcher.getModifier(modifier.modifier_group_id, modifier.modifier_id);
						orderItem.total += modifier.modifier.price;
					});
				});

				$scope.checkOrderChecked(order);
			});

			$scope.billItemsChanged();
			if ($scope.newBill) $scope.saveBill();
		});
	});

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

		order.allChecked = numChecked == max;
	}

	$scope.selectAll = function (order) {
		var select = true;
		if (order.allChecked == true) select = false;

		for (var i = 0; i < order.items.length; i++) {
			order.items[i].selected = select;

			if (order.items[i].billedFor) order.items[i].selected = false;
		}

		order.allChecked = select;
	}

	$scope.billItemsChanged = function () {
		$scope.bill.total = 0;

		$scope.orderItems.forEach(function (order) {
			for (var i = 0; i < order.items.length; i++) {
				if (order.items[i].selected != true) continue;

				$scope.bill.total += order.items[i].total;
			}
		});

		if (!$scope.$$phase) $scope.$digest();
	}

	$scope.saveBill = function (cb) {
		if (typeof cb != 'function') cb = function(){}

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
		$scope.saveBill(function () {
			$state.transitionTo('tabs.orderBills', {
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
			$state.transitionTo('tabs.orderBills', {
				group_id: $state.params.group_id
			});
		}).error(function () {
			$ionicPopup.alert({
				title: 'Bill could not be deleted'
			});
		});
	}

	$scope.setBillAmount = function () {
		$scope.bill.paid_amount = parseFloat($scope.bill.totalFormatted)
	}
});