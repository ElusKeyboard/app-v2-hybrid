var app = angular.module('orderchef');

app.controller('SetupCtrl', function ($rootScope, $http, $ionicLoading, $state, datapack) {
	if (datapack.data == null || datapack.data.last_refreshed || (new Date(datapack.data.last_refreshed)).getTime() - Date.now() > 86400) {
		datapack.update().then(function () {
			$state.transitionTo('home');
		}, function () {
			$ionicLoading.show({
				templateUrl: 'views/loading.html'
			});
		});
	} else {
		$state.transitionTo('home');
	}
});

app.controller('SetupLoadingCtrl', function ($scope, $rootScope, $http, $ionicLoading, datapack, $state) {
	$scope.setup = function (venue_name, ip_address) {
		localStorage['setup_ip'] = ip_address;

		$http.post('/config/settings', {
			is_setup: true,
			venue_name: venue_name
		}).success(function () {
			$ionicLoading.hide();

			datapack.update().then(function () {
				$state.transitionTo('home');
			}, function () {
				$ionicLoading.show({
					templateUrl: 'views/loading.html'
				});
			});
		}).error(function () {
			$scope.status = 'Cannot set up.';
		});
	}
})