var app = angular.module('orderchef', ['ionic']);

app.config(function ($httpProvider) {
	$httpProvider.interceptors.push(function ($q) {
		return {
			'request': function (config) {
				if (config.url.indexOf('/views') === -1) {
					var url = localStorage['setup_ip'];
					config.url = url + '/api' + config.url;
				}

				return config || $q.when(config);
			}
		}
	});
});

app.run(function($rootScope, $ionicPlatform, $state) {
	$rootScope.venue_name = localStorage['venue_name'] || '';
	$rootScope.ip_address = localStorage['setup_ip'] || '';
	$rootScope.is_setup = !!localStorage['setup_ip'];

	$rootScope.reloadCache = function () {

	}

	$ionicPlatform.ready(function() {
		if (!$rootScope.is_setup) $state.transitionTo('setup');

		// Hide the accessory bar by default
		if (window.cordova && window.cordova.plugins.Keyboard) {
			cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
		}

		if (window.StatusBar) {
			StatusBar.styleDefault();
		}
	});
});