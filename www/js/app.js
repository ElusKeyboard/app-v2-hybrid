var app = angular.module('orderchef', ['ionic']);

// window.oc_info.is_ipad
window.oc_info = {
	is_ipad: window.innerWidth >= 768
}

app.config(function ($httpProvider, $ionicConfigProvider) {
	$ionicConfigProvider.views.swipeBackEnabled(false);

	$httpProvider.defaults.timeout = 5000;
	$httpProvider.interceptors.push(function ($q) {
		return {
			'request': function (config) {
				if (config.url.indexOf('http://') === -1 && config.url.indexOf('/datapack') === -1) {
					config.timeout = 2000;
				}

				if (config.url.indexOf('views/') === -1 && config.url.indexOf('http://') === -1) {
					var url = localStorage['setup_ip'];
					config.url = url + '/api' + config.url;
				}

				return config || $q.when(config);
			}
		}
	});
});

app.run(function($rootScope, $ionicPlatform, $state, $stateParams, $window, datapack) {
	$rootScope.$state = $state;
	$rootScope.$stateParams = $stateParams;
	$rootScope.oc_info = window.oc_info;

	$rootScope.venue_name = localStorage['venue_name'] || '';
	$rootScope.ip_address = localStorage['setup_ip'] || '';
	$rootScope.is_setup = !!localStorage['setup_ip'];
	$rootScope.datapack = datapack;

	$ionicPlatform.ready(function() {
		setTimeout(function () {
			if (!$rootScope.is_setup || datapack.data == null || !datapack.data.last_refreshed || (new Date(datapack.data.last_refreshed)).getTime() - Date.now() > 86400) {
				$state.go('setup');
			} else {
				$state.go('home');
			}
		}, 100);

		// Hide the accessory bar by default
		if (window.cordova && window.cordova.plugins.Keyboard) {
			cordova.plugins.Keyboard.disableScroll(true);
			// cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
		}

		if (window.StatusBar) {
			StatusBar.styleDefault();
		}
	});
});

app.service('datapack', function ($q, $http) {
	var self = this;

	try {
		this.data = JSON.parse(localStorage['datapack']);
		if (!this.data || typeof this.data != 'object') throw Error();
	} catch (_) {
		this.data = null;
	}

	this.update = function () {
		var d = $q.defer();

		$http.get('/datapack').success(function (data) {
			if (typeof data != 'object') {
				self.data = null;
				return d.reject();
			}

			self.data = data;
			self.data.last_refreshed = Date.now();
			localStorage['datapack'] = JSON.stringify(data);
			d.resolve();
		}).error(function () {
			d.reject();
		});

		return d.promise;
	}

	return this;
});