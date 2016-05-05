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
				window.open(localStorage['setup_ip'] + '/public/html/admin', '_blank', 'location=yes');
			}

			$scope.update = {
				updating: false,
				progress: '99.5'
			};

			// var deploy = new Ionic.Deploy();

			// Update app code with new release from Ionic Deploy
			$scope.doUpdate = function() {
				deploy.update().then(function(res) {
					$scope.update.updating = false;
					if (!$scope.$$phase) $scope.$digest();

					console.log('Ionic Deploy: Update Success! ', res);
				}, function(err) {
					$scope.update.updating = false;
					if (!$scope.$$phase) $scope.$digest();

					console.log('Ionic Deploy: Update error! ', err);
				}, function(prog) {
					$scope.update.updating = false;
					$scope.update.progress = prog;
					if (!$scope.$$phase) $scope.$digest();

					console.log('Ionic Deploy: Progress... ', prog);
				});
			};

			// Check Ionic Deploy for new code
			$scope.checkForUpdates = function () {
				console.log('Ionic Deploy: Checking for updates');
				deploy.check().then(function (hasUpdate) {
					console.log('Ionic Deploy: Update available: ' + hasUpdate);

					if (!hasUpdate) {
						return;
					}

					$ionicPopup.confirm({
						title: 'Update available'
					}).then(function (res) {
						if (res) {
							$scope.doUpdate();
						}
					});
				}, function (err) {
					console.error('Ionic Deploy: Unable to check for updates', err);
				});
			}

			// $scope.checkForUpdates();
		}
	});
});