var app = angular.module('orderchef');

app.config(function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/setup');

	$stateProvider
	.state('setup', {
		url: '/setup',
		templateUrl: 'views/setup.html',
		controller: 'SetupCtrl'
	})
	.state('tabs', {
		url: '/tabs',
		templateUrl: 'views/tabs.html',
		abstract: true
	});
});