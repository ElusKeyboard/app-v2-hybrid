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
		controller: function ($scope, $ionicPopup) {
			$scope.openConfig = function () {
				window.open(localStorage['setup_ip'] + '/public/html/admin', '_system', 'location=yes');
			}

			// var deploy = new Ionic.Deploy();

			// // Update app code with new release from Ionic Deploy
			// $scope.doUpdate = function() {
			// 	deploy.update().then(function(res) {
			// 		console.log('Ionic Deploy: Update Success! ', res);
			// 	}, function(err) {
			// 		console.log('Ionic Deploy: Update error! ', err);
			// 	}, function(prog) {
			// 		console.log('Ionic Deploy: Progress... ', prog);
			// 	});
			// };

			// // Check Ionic Deploy for new code
			// $scope.checkForUpdates = function() {
			// 	console.log('Ionic Deploy: Checking for updates');
			// 	deploy.check().then(function(hasUpdate) {
			// 		$ionicPopup.prompt({
			// 			title: 'Update available'
			// 		}).then(function (res) {
			// 			if (res) {
			// 				$scope.doUpdate();
			// 			}
			// 		});

			// 		console.log('Ionic Deploy: Update available: ' + hasUpdate);
			// 	}, function(err) {
			// 		console.error('Ionic Deploy: Unable to check for updates', err);
			// 	});
			// }
		}
	});
});