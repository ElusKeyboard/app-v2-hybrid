var app = angular.module('orderchef');

app.config(function($stateProvider) {
	$stateProvider
	.state('tabs.delivery', {
		url: '/delivery',
		views: {
			delivery: {
				templateUrl: 'views/delivery/delivery.html'
			}
		}
	});
});