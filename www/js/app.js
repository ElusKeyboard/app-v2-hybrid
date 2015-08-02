var app = angular.module('orderchef', ['ionic']);

app.config(function ($httpProvider) {
	$httpProvider.interceptors.push(function ($q) {
		return {
			'request': function (config) {
				if (config.url.indexOf('views/') === -1) {
					var url = localStorage['setup_ip'];
					config.url = url + '/api' + config.url;
				}

				return config || $q.when(config);
			}
		}
	});
});

app.run(function($rootScope, $ionicPlatform, $state, datapack) {
	$rootScope.venue_name = localStorage['venue_name'] || '';
	$rootScope.ip_address = localStorage['setup_ip'] || '';
	$rootScope.is_setup = !!localStorage['setup_ip'];
	$rootScope.datapack = datapack;

	$ionicPlatform.ready(function() {
		if (!$rootScope.is_setup || datapack.data == null || !datapack.data.last_refreshed || (new Date(datapack.data.last_refreshed)).getTime() - Date.now() > 86400) {
			$state.transitionTo('setup');
		}

		// Hide the accessory bar by default
		if (window.cordova && window.cordova.plugins.Keyboard) {
			// cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
		}

		if (window.StatusBar) {
			StatusBar.styleDefault();
		}
	});
});

app.service('datapack', function ($q, $http, $ionicLoading) {
	var self = this;

	this.data = null;
	if (localStorage['datapack']) {
		this.data = JSON.parse(localStorage['datapack']);
	}

	this.update = function () {
		$ionicLoading.show({
			template: 'Loading Cache..'
		});

		var d = $q.defer();

		$http.get('/datapack').success(function (data) {
			self.data = data;
			self.data.last_refreshed = Date.now();
			localStorage['datapack'] = JSON.stringify(data);

			$ionicLoading.hide();

			d.resolve();
		}).error(function () {
			$ionicLoading.hide();

			d.reject();
		});

		return d.promise;
	}

	return this;
});