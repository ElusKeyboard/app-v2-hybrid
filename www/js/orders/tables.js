var app = angular.module('orderchef');

app.controller('TablesCtrl', function ($scope, $rootScope, $http, $ionicPopover, $ionicPopup, $state, datapack) {
	// for ipad view
	$scope.selected_table_id = null;

	var tableTypes = {};
	for (var i = 0; i < datapack.data.tables.length; i++) {
		var table = datapack.data.tables[i];
		if (!tableTypes[table.type_id]) {
			tableTypes[table.type_id] = {
				type: table.table_type,
				tables: []
			}
		}

		tableTypes[table.type_id].tables.push(table);
	}

	$scope.tableTypes = [];
	for (var tableType in tableTypes) {
		if (!tableTypes.hasOwnProperty(tableType)) continue;
		$scope.tableTypes.push(tableTypes[tableType]);
	}
	tableTypes = null;

	$ionicPopover.fromTemplateUrl('views/orders/openTablePopover.html', {
		scope: $scope
	}).then(function (popover) {
		$scope.popover = popover;
	});

	$scope.refresh = function () {
		$http.get('/tables/open')
		.success(function(data) {
			$scope.openTables = data;

			for (var i = 0; i < data.length; i++) {
				if (data[i].last_printed_order)
					data[i].last_printed_order_formatted = moment(data[i].last_printed_order).fromNow()
				for (var x = 0; x < datapack.data.tables.length; x++) {
					if (datapack.data.tables[x].id == data[i].id) {
						data[i].table_type = datapack.data.tables[x].table_type;
						break;
					}
				}
			}
		}).error(function () {
			$ionicPopup.alert({
				title: 'Cannot refresh Tables'
			});
		});
	}

	$scope.refresh();

	$scope.showTable = function (table_id) {
		if (window.oc_info.is_ipad) {
			$scope.selected_table_id = table_id;
			$scope.refresh();
			$rootScope.$emit('tables.open', table_id);
			return;
		}

		$state.go('orders', {
			table_id: table_id
		});
	}

	var tables_reload_cleanup = $rootScope.$on('tables.reload', function () {
		$scope.refresh();
	});
	$scope.$on('$destroy', function () {
		tables_reload_cleanup();
	});

	$scope.openTable = function (table) {
		$http.get('/table/' + table.id + '/group').success(function () {
			$scope.popover.hide();
			$scope.showTable(table.id);
		}).error(function () {
			$ionicPopup.alert({
				title: 'Cannot open Table'
			});
		});
	}
});