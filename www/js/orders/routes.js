var app = angular.module('orderchef');

app.config(function($stateProvider) {
	$stateProvider
	.state('tabs.tables', {
		url: '/tables',
		views: {
			tables: {
				templateUrl: 'views/orders/tables.html',
				controller: 'TablesCtrl',
			}
		}
	})
	.state('tabs.orders', {
		url: '/table/:table_id',
		views: {
			tables: {
				templateUrl: 'views/orders/orders.html',
				controller: 'OrdersCtrl'
			}
		},
		resolve: {
			OrderGroup: function ($q, $http, $stateParams) {
				var d = $q.defer();

				$http.get('/table/' + $stateParams.table_id + '/group')
				.success(function (group) {
					d.resolve(group);
				}).error(function () {
					d.reject();
				});

				return d.promise;
			}
		}
	})
	.state('tabs.orderBills', {
		url: '/order/:group_id/bills',
		views: {
			tables: {
				templateUrl: 'views/orders/bills.html',
				controller: 'OrderBillsCtrl'
			}
		},
		resolve: {
			OrderGroup: getOrderGroup
		}
	})
	.state('tabs.newOrderBill', {
		url: '/order/:group_id/bill/new',
		views: {
			tables: {
				templateUrl: 'views/orders/bill.html',
				controller: 'OrderBillCtrl'
			}
		},
		resolve: {
			OrderGroup: getOrderGroup,
			Bill: function ($q, $http, $stateParams) {
				return {};
			}
		}
	})
	.state('tabs.orderBill', {
		url: '/order/:group_id/bill/:bill_id',
		views: {
			tables: {
				templateUrl: 'views/orders/bill.html',
				controller: 'OrderBillCtrl'
			}
		},
		resolve: {
			OrderGroup: getOrderGroup,
			Bill: function ($q, $http, $stateParams) {
				var d = $q.defer();

				$http.get('/order-group/' + $stateParams.group_id + '/bill/' + $stateParams.bill_id).success(function (bill) {
					d.resolve(bill);
				}).error(function () {
					d.reject();
				});

				return d.promise;
			}
		}
	});
});

function getOrderGroup ($q, $http, $stateParams) {
	var d = $q.defer();

	$http.get('/order-group/' + $stateParams.group_id)
	.success(function (group) {
		d.resolve(group);
	}).error(function () {
		d.reject();
	});

	return d.promise;
}