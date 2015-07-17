var app = angular.module('orderchef');

app.controller('SetupCtrl', function ($rootScope, $http, $ionicLoading, $state) {
	$rootScope.loadSettings = function () {
		$http.get('/config/settings')
		.success(function (data) {
			$rootScope.venue_name = data.venue_name;
			$rootScope.is_setup = data.is_setup;
			$ionicLoading.hide();

			$ionicLoading.show({
				template: 'Loading Cache..'
			});
			$rootScope.reloadCache().then(function () {
				$ionicLoading.hide();
				// $state.transitionTo('tables');
			});
		}).error(function () {
			$ionicLoading.show({
				templateUrl: '/views/loading.html'
			});
		});
	}

	$rootScope.loadSettings();
});

app.controller('SetupLoadingCtrl', function ($scope, $rootScope, $http, $ionicLoading) {
	$scope.setup = function (venue_name, ip_address) {
		localStorage['setup_ip'] = ip_address;
		localStorage['venue_name'] = venue_name;

		if ($rootScope.is_setup) {
			$http.post('/config/settings', {
				is_setup: true,
				venue_name: $rootScope.venue_name
			}).success(function () {
				$rootScope.loadSettings();
			}).error(function () {
				$rootScope.loadSettings();
			});
		} else {
			$http.get('/ping').success(function () {
				$rootScope.is_setup = true;
				$rootScope.loadSettings();
			}).error(function () {
				$rootScope.loadSettings();
			});
		}
	}
})