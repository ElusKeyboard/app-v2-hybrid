var app = angular.module('orderchef');

app.controller('OrdersCtrl', function ($scope, $http, $ionicModal, OrderGroup, datapack, dataMatcher, $ionicPopup, OrderItemService) {
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

	$scope.refresh();

	for (var i = 0; i < datapack.data.tables.length; i++) {
		if (datapack.data.tables[i].id == OrderGroup.table_id) {
			$scope.table = datapack.data.tables[i];
			break;
		}
	}

	$scope.addOrder = function (order_type) {
		$http.post('/order-group/' + $scope.group.id + '/orders', {
			type_id: order_type.id
		}).success(function (order) {
			$scope.addOrderModal.hide();
			$scope.refresh();
		}).error(function (err) {
			$ionicPopup.alert({
				title: 'Cannot add order!',
				template: err
			});
		});
	}

	// modal stuff

	$scope.showEditItem = function (item) {
		$scope.editedItem = item;
		$scope.itemModal.show();
	}
	$scope.closeEditItem = function () {
		$scope.editedItem = null;
		$scope.itemModal.hide();
	}

	$scope.showAddItem = function (orderGroup) {
		OrderItemService.showModal(orderGroup);
	}

	$scope.showAddOrder = function () {
		$scope.addOrderModal.show();
	}
	$scope.hideAddOrder = function () {
		$scope.addOrderModal.hide();
	}

	$ionicModal.fromTemplateUrl('views/orders/itemModal.html', {
		scope: $scope,
		animation: 'slide-in-up'
	}).then(function (modal) {
		$scope.itemModal = modal;
	});

	$ionicModal.fromTemplateUrl('views/orders/addOrderModal.html', {
		scope: $scope,
		animation: 'slide-in-up'
	}).then(function (modal) {
		$scope.addOrderModal = modal;
	});
});

app.service('OrderItemService', function ($ionicModal, $http, $rootScope, datapack) {
	var self = this;
	this.modal = null;
	this.scope = $rootScope.$new();

	this.showModal = function (orderGroup) {
		this.scope.orderGroup = orderGroup;
		this.modal.show();
	}

	this.scope.categories = [];
	this.scope.closeModal = function () {
		self.modal.hide();
	}
	this.scope.addItem = function (category, item) {
	}

	datapack.data.categories.forEach(function (category) {
		var cat = {
			items: [],
			category: category
		}

		for (var i = 0; i < datapack.data.items.length; i++) {
			var item = datapack.data.items[i];
			if (item.category_id != category.id) {
				continue;
			}

			var modifiers = [];
			for (var item_modifier_i = 0; item_modifier_i < item.modifiers.length; item_modifier_i++) {
				var item_modifier = item.modifiers[item_modifier_i];
				for (var modifier_i = 0; modifier_i < datapack.data.modifiers.length; modifier_i++) {
					var mod = datapack.data.modifiers[modifier_i];
					if (mod.id == item_modifier.id) {
						modifiers.push(mod);
						break;
					}
				}
			}

			cat.items.push({
				item: item,
				modifiers: modifiers
			});
		}

		if (cat.items.length == 0) return;

		self.scope.categories.push(cat);
	});

	$ionicModal.fromTemplateUrl('views/orders/addItemModal.html', {
		scope: self.scope,
		animation: 'slide-in-up'
	}).then(function (modal) {
		self.modal = modal;
	});

	return this;
});