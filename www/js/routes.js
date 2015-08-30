var app = angular.module('orderchef');

app.config(function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/setup');

	$stateProvider
	.state('setup', {
		url: '/setup',
		templateUrl: 'views/setup.html',
		controller: 'SetupCtrl'
	})
	.state('home', {
		url: '/home',
		templateUrl: 'views/homepage.html',
		controller: function ($scope) {
			$scope.openConfig = function () {
				window.open(localStorage['setup_ip'] + '/public/html/admin', '_system', 'location=yes');
			}
		}
	});
});