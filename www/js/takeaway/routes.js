var app = angular.module('orderchef');

app.config(function($stateProvider) {
	$stateProvider
	.state('tabs.takeaway', {
		url: '/takeaway',
		views: {
			takeaway: {
				templateUrl: 'views/takeaway/takeaway.html'
			}
		}
	});
});