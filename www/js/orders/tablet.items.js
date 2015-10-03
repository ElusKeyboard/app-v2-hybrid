var app = angular.module('orderchef');

app.controller('TabletItemsCtrl', function ($scope, $rootScope, $http, $ionicModal, $ionicPopup, $ionicActionSheet, datapack, dataMatcher, OrderItemService, $ionicScrollDelegate) {
	$scope.categories = OrderItemService.scope.categories;

	$scope.openCloseCategory = function (category) {
		var lastState = category.open;
		for (var i = 0; i < $scope.categories.length; i++) {
			$scope.categories[i].open = false;
		}

		category.open = !lastState;
		$ionicScrollDelegate.$getByHandle('itemsScroll').resize();
	}

	$scope.addItem = function (category, item) {
		$rootScope.$emit('items.add', category, item);
	}
});