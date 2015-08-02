var app = angular.module('orderchef');

app.controller('OrdersCtrl', function ($scope, $http, $ionicModal, OrderGroup, datapack, dataMatcher, $ionicPopup, OrderItemService, $ionicActionSheet) {
	$scope.group = OrderGroup;
	OrderItemService.parent = $scope;

	$scope.refresh = function (cb) {
		if (typeof cb != 'function') cb = function (){}

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

			cb();
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

	$scope.selectOrderGroup = function (group) {
		$ionicActionSheet.show({
			buttons: [{
				text: 'Re-Print'
			}, {
				text: 'Submit'
			}],
			destructiveText: 'Remove Order',
			cancelText: 'Cancel'
		});
	}

	// modal stuff

	$scope.showEditItem = function (item_id) {
		// order_item_id = item_id;
		for (var oi = 0; oi < $scope.orderItems.length; oi++) {
			var order_group = $scope.orderItems[oi];

			for (var i = 0; i < order_group.items.length; i++) {
				var item = order_group.items[i];

				if (item.id == item_id) {
					if (!item.item) {
						$ionicPopup.alert({
							title: 'Order Item Invalid',
							template: 'The order item either does not exist or is unavailable.'
						});

						return;
					}

					item.item.modifier_objects = [];
					item.item.modifiers.forEach(function (modifier_id) {
						item.item.modifier_objects.push(JSON.parse(JSON.stringify(dataMatcher.getModifierGroup(modifier_id))));
					});

					item.item.modifier_objects.forEach(function (modGroup) {
						for (var mi = 0; mi < item.modifiers.length; mi++) {
							if (item.modifiers[mi].modifier_group_id != modGroup.id) continue;

							modGroup.modifiers.forEach(function (mod) {
								mod.selected = item.modifiers[mi].modifier_id == mod.id
							});
						}
					})

					$scope.editedItem = item;
					$scope.itemModal.show();

					return;
				}
			}
		}

		$ionicPopup.alert({
			title: 'Could not find item',
			template: ''
		});
	}
	$scope.closeEditItem = function () {
		$scope.editedItem = null;
		$scope.itemModal.hide();

		$scope.getItemModal().then(function (modal) {
			$scope.itemModal.remove();
			$scope.itemModal = modal;
		});
	}

	$scope.removeOrderItem = function (item) {
		console.log(item);
		$http.delete('/order/' + item.order_id + '/item/' + item.id)
		.success(function () {
			$scope.closeEditItem();
			$scope.refresh();
		})
		.error(function (err) {
			$ionicPopup.alert({
				title: 'Could not delete item',
				template: err
			})
		})
	}

	$scope.showAddItem = function (order) {
		OrderItemService.showModal(order);
	}

	$scope.showAddOrder = function () {
		$scope.addOrderModal.show();
	}
	$scope.hideAddOrder = function () {
		$scope.addOrderModal.hide();
	}

	$scope.getItemModal = function () {
		return $ionicModal.fromTemplateUrl('views/orders/itemModal.html', {
			scope: $scope,
			animation: 'slide-in-up'
		});
	}

	$scope.getItemModal().then(function (modal) {
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

	this.showModal = function (order) {
		self.scope.order = order;
		self.modal.show();
	}

	this.scope.categories = [];
	this.scope.closeModal = function () {
		self.modal.hide();
	}
	this.scope.addItem = function (category, item) {
		$http.post('/order/' + self.scope.order.id + '/items', {
			item_id: item.item.id,
			order_id: self.scope.order.id
		}).success(function (order_item) {
			self.parent.refresh(function () {
				self.parent.showEditItem(order_item.id);
			});
		}).error(function (err) {
			$ionicPopup.alert({
				title: 'Cannot add item to order!',
				template: err
			});
		});
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