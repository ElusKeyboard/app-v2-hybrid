var app = angular.module('orderchef');

app.controller('OrdersCtrl', function ($scope, $http, $ionicModal, OrderGroup, datapack, dataMatcher) {
	$scope.group = OrderGroup;

	$scope.refresh = function () {
		$http.get('/order-group/' + OrderGroup.id + '/orders').success(function (orders) {
			$scope.orderItems = orders;

			$scope.orderItems.forEach(function (orderItem) {
				orderItem.type = dataMatcher.getOrderType(orderItem.type_id);

				orderItem.items.forEach(function (item) {
					item.item = dataMatcher.getItem(item.item_id);

					item.modifiers.forEach(function (modifier) {
						modifier.group = dataMatcher.getModifierGroup(modifier.modifier_group_id);
						modifier.modifier = dataMatcher.getModifier(modifier.modifier_group_id, modifier.modifier_id);
					});
				});
			});
		});
	}

	$scope.editItem = function (item) {
		$scope.editedItem = item;
		$scope.itemModal.show();
	}
	$scope.closeEditItem = function () {
		$scope.editedItem = null;
		$scope.itemModal.hide();
	}

	$scope.addItem = function (orderGroup) {
		$scope.addOrderGroup = orderGroup;
		$scope.addItemModal.show();
	}
	$scope.closeAddItem = function () {
		$scope.addOrderGroup = null;
		$scope.addItemModal.hide();
	}

	$scope.addOrder = function () {
		$scope.addOrderModal.show();
	}
	$scope.closeAddOrder = function () {
		$scope.addOrderModal.hide();
	}

	$scope.refresh();

	for (var i = 0; i < datapack.data.tables.length; i++) {
		if (datapack.data.tables[i].id == OrderGroup.table_id) {
			$scope.table = datapack.data.tables[i];
			break;
		}
	}

	$ionicModal.fromTemplateUrl('views/addItemModal.html', {
		scope: $scope,
		animation: 'slide-in-up'
	}).then(function (modal) {
		$scope.addItemModal = modal;
	});

	$ionicModal.fromTemplateUrl('views/itemModal.html', {
		scope: $scope,
		animation: 'slide-in-up'
	}).then(function (modal) {
		$scope.itemModal = modal;
	});

	$ionicModal.fromTemplateUrl('views/addOrderModal.html', {
		scope: $scope,
		animation: 'slide-in-up'
	}).then(function (modal) {
		$scope.addOrderModal = modal;
	});
});