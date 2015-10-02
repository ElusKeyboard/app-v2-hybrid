var app = angular.module('orderchef');

app.controller('TabletItemsCtrl', function ($scope, $rootScope, $http, $ionicModal, $ionicPopup, $ionicActionSheet, datapack, dataMatcher, OrderItemService, $ionicScrollDelegate) {
	$scope.categories = OrderItemService.scope.categories;

	$scope.openCloseCategory = function (category) {
		category.open = !category.open;
		$ionicScrollDelegate.resize();
	}

	$scope.addItem = function (category, item) {
		$rootScope.$emit('items.add', category, item);
	}
});