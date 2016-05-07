var app = angular.module('orderchef');

app.service('dataMatcher', function (datapack) {
	function findById(source, id) {
		for (var i = 0; i < source.length; i++) {
			if (source[i].id === id) return source[i];
		}

		return false;
	}

	return {
		getTableType: function (id) {
			return findById(datapack.data.table_types, id);
		},
		getOrderType: function (id) {
			return findById(datapack.data.order_types, id);
		},
		getItem: function (id) {
			return findById(datapack.data.items, id);
		},
		getItemCategory: function (id) {
			return findById(datapack.data.categories, id);
		},
		getModifier: function (group_id, id) {
			var group = findById(datapack.data.modifiers, group_id);
			if (!group) return null;

			for (var i = 0; i < group.modifiers.length; i++) {
				if (group.modifiers[i].id === id) return group.modifiers[i];
			}

			return null;
		},
		getModifierGroup: function (id) {
			return findById(datapack.data.modifiers, id);
		}
	}
});