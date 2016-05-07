var app = angular.module('orderchef');

var deps = ['$scope', '$rootScope', '$state', '$http', '$ionicModal', '$ionicPopup', '$ionicLoading', '$ionicActionSheet', 'OrderItemService', 'datapack', 'dataMatcher'];
if (!window.oc_info.is_ipad) deps.push('OrderGroup');

deps.push(OrdersCtrl);

app.controller('OrdersCtrl', deps);

function OrdersCtrl ($scope, $rootScope, $state, $http, $ionicModal, $ionicPopup, $ionicLoading, $ionicActionSheet, OrderItemService, datapack, dataMatcher, OrderGroup) {
	$scope.group = OrderGroup;
	OrderItemService.parent = $scope;

	if (window.oc_info.is_ipad) {
		$scope.group = null
		$scope.is_tablet = true;
		$scope.activeOrderID = null;
	}

	$scope.refresh = function (cb) {
		if (typeof cb != 'function') cb = function (){}

		$http.get('/order-group/' + $scope.group.id + '/orders').success(function (orders) {
			$scope.orderItems = orders;

			orders.forEach(function (order) {
				order.type = dataMatcher.getOrderType(order.type_id);

				order.items.forEach(function (orderItem) {
					orderItem.item = dataMatcher.getItem(orderItem.item_id);

					orderItem.modifiers.forEach(function (modifier) {
						modifier.group = dataMatcher.getModifierGroup(modifier.modifier_group_id);
						modifier.modifier = dataMatcher.getModifier(modifier.modifier_group_id, modifier.modifier_id);
					});
				});
			});

			cb();
		}).error(function () {
			$ionicPopup.alert({
				title: 'Cannot get orders!'
			});
		});
	}

	$scope.saveGroup = function () {
		$http.put('/order-group/' + $scope.group.id, $scope.group).error(function () {
			$ionicPopup.alert({
				title: 'Failed to save group'
			});
		});
	}

	$scope.addOrder = function (order_type) {
		$http.post('/order-group/' + $scope.group.id + '/orders', {
			type_id: order_type.id
		}).success(function (order) {
			$scope.activeOrderID = order.id;
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
		var title = 'Not Printed yet'
		var buttons = [{
			text: 'Print'
		}]

		if (group.printed_at) {
			var printed_at = moment(group.printed_at);
			title = 'Printed ' + printed_at.fromNow() + ' (at ' + printed_at.format('hh:mm') + ')';
			buttons[0].text = 'Re-Print';

			buttons.push({
				text: 'Add another item'
			});
		}

		$ionicActionSheet.show({
			titleText: title,
			buttons: buttons,
			destructiveText: 'Remove Order',
			cancelText: 'Cancel',
			cancel: function () {
				return true
			},
			buttonClicked: function (buttonIndex) {
				if (buttonIndex == 1) {
					$scope.showAddItem(group);
					return true;
				}

				$http.post('/order/' + group.id + '/print')
				.success(function () {
					group.printed_at = Date.now()
				}).error(function (data, status) {
					group.printed_at = Date.now()

					if (status == 503) {
						$ionicPopup.alert({
							title: 'Some printers are not connected',
							template: 'The receipts were not printed to the following printers:<br/> - ' + data.join('<br/> - ')
						});
					} else {
						$ionicPopup.alert({
							title: 'Could not print receipt',
							template: 'Server error.'
						});
					}
				});

				return true
			},
			destructiveButtonClicked: function () {
				$ionicPopup.confirm({
					title: 'Remove Order',
					template: 'Are you sure you want to remove this order?',
					okText: 'Delete',
					okType: 'button-assertive'
				}).then(function (result) {
					if (!result) {
						return;
					}

					$http.delete('/order/' + group.id).success(function () {
						$scope.refresh();
					}).error(function () {
						$ionicPopup.alert({
							title: 'Could not delete order'
						});
					});
				});

				return true;
			}
		});
	}

	// modal stuff

	$scope.showEditItem = function (item_id) {
		// order_item_id = item_id;
		for (var oi = 0; oi < $scope.orderItems.length; oi++) {
			var order = $scope.orderItems[oi];

			for (var i = 0; i < order.items.length; i++) {
				var item = order.items[i];

				if (item.id == item_id) {
					if (!item.item) {
						$ionicPopup.alert({
							title: 'Order Item Invalid',
							template: 'The order item either does not exist or is unavailable.'
						});

						return;
					}

					$scope.prepareEditedItem(order, item);

					return;
				}
			}
		}

		$ionicPopup.alert({
			title: 'Could not find item',
			template: ''
		});
	}
	$scope.closeEditItem = function (save) {
		if (typeof save == 'undefined') save = true;

		function cb () {
			$scope.editedItem = null;
			$scope.editedOrder = null;

			$scope.itemModal.hide();
			$scope.refresh();

			$scope.getItemModal().then(function (modal) {
				$scope.itemModal.remove();
				$scope.itemModal = modal;
			});
		}

		if (save) {
			var requiredModifiers = [];
			for (var i = 0; i < $scope.editedItem.item.modifier_objects.length; i++) {
				if ($scope.editedItem.item.modifier_objects[i].error) {
					requiredModifiers.push(' - ' + $scope.editedItem.item.modifier_objects[i].name)
				}
			}
			if (requiredModifiers.length > 0) {
				$ionicPopup.alert({
					title: 'Required Modifiers have not been selected',
					template: requiredModifiers.join('<br/>')
				});
				return;
			}

			$http.put('/order/' + $scope.editedOrder.id + '/item/' + $scope.editedItem.id, {
				item_id: $scope.editedItem.item_id,
				order_id: $scope.editedItem.order_id,
				notes: $scope.editedItem.notes,
				quantity: $scope.editedItem.quantity
			}).error(function () {
				$ionicPopup.alert({
					title: 'Could not save order item notes',
					template: ''
				});
			}).success(cb);
		} else {
			cb();
		}
	}
	$scope.selectModifierForEditedItem = function (modifierGroup, modifier) {
		var chain = [];

		for (var ii = 0; ii < $scope.editedItem.modifiers.length; ii++) {
			var mi = $scope.editedItem.modifiers[ii];
			if (mi.modifier_group_id == modifierGroup.id) {
				chain.push([$http.delete, '/modifier/' + mi.id]);
				// $scope.editedItem.modifiers.splice(ii--, 1);
			}
		}

		for (var i = 0; i < $scope.editedItem.item.modifier_objects.length; i++) {
			var group = $scope.editedItem.item.modifier_objects[i];
			if (group.id != modifierGroup.id) continue;

			for (var x = 0; x < group.modifiers.length; x++) {
				var mod = group.modifiers[x];

				if (mod.id == modifier.id) {
					if (mod.selected && !modifierGroup.choice_required) {
						// deselect it
						mod.selected = false;
						continue;
					}

					mod.selected = true;

					chain.push([$http.post, '/modifiers', {
						modifier_group_id: modifierGroup.id,
						modifier_id: modifier.id,
						order_item_id: $scope.editedItem.id
					}, function (newModifier) {
						$scope.editedItem.modifiers.push(newModifier);
					}]);

					continue;
				}

				mod.selected = false;
			}

			$scope.checkRequiredModifierGroups();
		}

		async.eachSeries(chain, function (todo, cb) {
			todo[0]('/order/' + $scope.editedOrder.id + '/item/' + $scope.editedItem.id + todo[1], todo.length > 2 ? todo[2] : null)
			.success(function (data) {
				if (todo.length > 3) todo[3](data);
				cb();
			}).error(function () {
				cb();
			});
		});
	}
	$scope.prepareEditedItem = function (order, item) {
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
		});

		$scope.editedOrder = order;
		$scope.editedItem = item;

		$scope.itemModal.show();

		$scope.checkRequiredModifierGroups();
	}
	$scope.checkRequiredModifierGroups = function () {
		$scope.editedItem.item.modifier_objects.forEach(function (group) {
			if (!group.choice_required) return;

			// check if one choice is made
			group.error = true;
			for (var i = 0; i < group.modifiers.length; i++) {
				if (group.modifiers[i].selected) {
					group.error = false;
					break;
				}
			}
		});
	}

	$scope.removeOrderItem = function (item) {
		$http.delete('/order/' + item.order_id + '/item/' + item.id)
		.success(function () {
			$scope.closeEditItem(false);
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
		if (window.oc_info.is_ipad) {
			$scope.activeOrderID = order.id;
			return;
		}

		OrderItemService.showModal(order);
	}

	$scope.showAddOrder = function () {
		$scope.addOrderModal.show();
	}
	$scope.hideAddOrder = function () {
		$scope.addOrderModal.hide();
	}
	$scope.findTableObject = function () {
		for (var i = 0; i < datapack.data.tables.length; i++) {
			if (datapack.data.tables[i].id == $scope.group.table_id) {
				$scope.table = datapack.data.tables[i];
				break;
			}
		}
	}

	$scope.showBills = function () {
		if ($scope.group.covers == 0 && (!$scope.orderItems || $scope.orderItems.length > 0)) {
			$ionicPopup.alert({
				title: 'Enter Cover information',
				template: 'Select how many covers (guests)'
			});

			$('#covers').focus()

			return;
		}

		if (window.oc_info.is_ipad) {
			var scope = $rootScope.$new();
			var modal = null;

			scope.group = $scope.group;
			scope.hideModal = function () {
				modal.hide();
			}

			$ionicModal.fromTemplateUrl('views/orders/bills.modal.html', {
				scope: scope,
				animation: 'slide-in-up'
			}).then(function (m) {
				modal = m;
				modal.show();
			});
			scope.$on('$destroy', function () {
				modal.remove();
			})

			return;
		}

		$state.go('orderBills', { group_id: $scope.group.id });
	}

	if (!window.oc_info.is_ipad) {
		$scope.refresh();
		$scope.findTableObject();
	} else {
		var cleanup = [];
		cleanup.push($rootScope.$on('tables.open', function (ev, table_id) {
			$http.get('/table/' + table_id + '/group')
			.success(function (group) {
				$scope.group = group;
				$scope.activeOrderID = null;
				$scope.refresh();
				$scope.findTableObject();
			}).error(function () {
				$ionicPopup.alert({
					title: 'Cannot get table orders!'
				});
			});
		}));

		cleanup.push($rootScope.$on('items.add', function (ev, category, item) {
			if (!$scope.activeOrderID) {
				$ionicPopup.alert({
					title: 'Select Order first!',
					template: 'Click on "+ Add Item"'
				});
				return;
			}

			$http.post('/order/' + $scope.activeOrderID + '/items', {
				item_id: item.item.id,
				order_id: $scope.activeOrderID
			}).success(function (order_item) {
				$scope.refresh(function () {
					$ionicLoading.show({
						template: 'Added ' + item.item.name
					});
					setTimeout(function () {
						$ionicLoading.hide();
					}, 500);
					// self.parent.showEditItem(order_item.id);
				});
			}).error(function (err) {
				$ionicPopup.alert({
					title: 'Cannot add item to order!',
					template: err
				});
			});
		}));

		cleanup.push($rootScope.$on('orders.clearTable', function () {
			$scope.group = null
			$scope.is_tablet = true;
			$scope.activeOrderID = null;
		}));

		$scope.$on('$destroy', function () {
			cleanup.forEach(function (c) {
				c();
			});
		})
	}

	// modals stuff
	$scope.getItemModal = function () {
		return $ionicModal.fromTemplateUrl('views/orders/itemModal.html', {
			scope: $scope,
			animation: 'slide-in-up',
			backdropClickToClose: false,
			hardwareBackButtonClose: false
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
};

app.service('OrderItemService', function ($ionicModal, $ionicLoading, $http, $rootScope, datapack, $ionicScrollDelegate) {
	var self = this;
	this.modal = null;
	this.scope = $rootScope.$new();

	this.showModal = function (order) {
		self.scope.order = order;
		self.modal.show();
	}

	this.scope.openCloseCategory = function (category) {
		var wasOpen = false;
		for (var i = 0; i < self.scope.categories.length; i++) {
			if (self.scope.categories[i] == category) wasOpen = self.scope.categories[i].open;
			self.scope.categories[i].open = false;
		}

		if (!wasOpen) {
			category.open = !category.open;
		}
		$ionicScrollDelegate.resize();
	}
	this.scope.categories = [];
	this.scope.closeModal = function () {
		self.modal.hide();
		self.modal.remove();

		$ionicModal.fromTemplateUrl('views/orders/addItemModal.html', {
			scope: self.scope,
			animation: 'slide-in-up'
		}).then(function (modal) {
			self.modal = modal;
		});
	}
	this.scope.addItem = function (category, item) {
		$http.post('/order/' + self.scope.order.id + '/items', {
			item_id: item.item.id,
			order_id: self.scope.order.id
		}).success(function (order_item) {
			self.parent.refresh(function () {
				self.scope.activeOrderID = null;
				$ionicLoading.show({
					template: 'Added ' + item.item.name
				});
				setTimeout(function () {
					$ionicLoading.hide();
				}, 250);
				// self.parent.showEditItem(order_item.id);
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