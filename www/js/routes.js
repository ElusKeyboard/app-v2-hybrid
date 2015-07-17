var app = angular.module('orderchef');

app.config(function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/setup');

	$stateProvider
	.state('setup', {
		url: '/setup',
		templateUrl: '/views/setup.html',
		controller: 'SetupCtrl'
	})
	.state('tables', {
		url: '/tables',
		templateUrl: '/views/tables.html',
		// controller: 'TablesCtrl'
	})
	.state('orders', {
		url: '/table/:table_id',
		templateUrl: '/views/orders.html',
		controller: 'OrdersCtrl',
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
	});
});