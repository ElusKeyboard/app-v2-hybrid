var app = angular.module('orderchef');

app.controller('TablesCtrl', function ($scope, $http, $ionicPopover, datapack) {
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

	$ionicPopover.fromTemplateUrl('views/openTablePopover.html', {
		scope: $scope
	}).then(function (popover) {
		$scope.popover = popover;
	});

	$scope.refresh = function () {
		$http.get('/tables/open')
		.success(function(data) {
			$scope.openTables = data;

			for (var i = 0; i < data.length; i++) {
				for (var x = 0; x < datapack.data.tables.length; x++) {
					if (datapack.data.tables[x].id == data[i].id) {
						data[i].table_type = datapack.data.tables[x].table_type;
						break;
					}
				}
			}
		});
	}

	$scope.refresh();

	$scope.openTable = function (table) {
		$http.get('/table/' + table.id + '/group').success(function () {
			$scope.popover.hide();
			$scope.refresh();
		});
	}
});