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
});