(function () {
    "use strict";

    function RollbackController($scope, contentResource, localizationService, assetsService) {
        
        var vm = this;

        vm.rollback = rollback;
        vm.changeLanguage = changeLanguage;
        vm.changeVersion = changeVersion;
        vm.submit = submit;
        vm.close = close;

        //////////

        function onInit() {

            vm.loading = true;
            vm.variantVersions = [];
            vm.diff = null;
            vm.currentVersion = null;

            // find the current version for invariant nodes
            if($scope.model.node.variants.length === 1) {
                vm.currentVersion = $scope.model.node.variants[0];
            }

            // find the current version for nodes with variants
            if($scope.model.node.variants.length > 1) {
                var active = _.find($scope.model.node.variants, function (v) {
                    return v.active;
                });

                // preselect the language in the dropdown
                if(active) {
                    vm.selectedLanguage = active;
                    vm.currentVersion = active;
                }
            }

            // set default title
            if(!$scope.model.title) {
                localizationService.localize("actions_rollback").then(function(value){
                    $scope.model.title = value;
                });
            }

            // Load in diff library
            assetsService.loadJs('lib/jsdiff/diff.min.js', $scope).then(function () {

                getVersions().then(function(){
                    vm.loading = false;
                });

            });
            
        }

        function changeLanguage(language) {
            vm.currentVersion = language;
            getVersions();
        }

        function changeVersion(version) {
            console.log("version", version);
            contentResource.getRollbackVersion(version.versionId)
                .then(function(data){
                    vm.previousVersion = data;
                    vm.previousVersion.versionId = version.versionId;
                    createDiff(vm.currentVersion, vm.previousVersion);
                });

        }

        function getVersions() {

            const nodeId = $scope.model.node.id;
            const culture = $scope.model.node.variants.length > 1 ? vm.currentVersion.language.culture : null;

            return contentResource.getRollbackVersions(nodeId, culture)
                .then(function(data){
                    vm.previousVersions = data;
                });
        }

        /**
         * This will load in a new version
         */
        function createDiff(currentVersion, previousVersion) {

            vm.diff = {};
            vm.diff.properties = [];

            // find diff in name
            vm.diff.name = JsDiff.diffWords(currentVersion.name, previousVersion.name);

            // extract all properties from the tabs and create new object for the diff
            currentVersion.tabs.forEach((tab, tabIndex) => {
                tab.properties.forEach((property, propertyIndex) => {
                    var oldProperty = previousVersion.tabs[tabIndex].properties[propertyIndex];
                    var diffProperty = {
                        "alias": property.alias,
                        "label": property.label,
                        "diff": JsDiff.diffWords(property.value, oldProperty.value)
                    };
                    vm.diff.properties.push(diffProperty);
                });
            });

        }

        function rollback() {

            vm.rollbackButtonState = "busy";

            const nodeId = $scope.model.node.id;
            const versionId = vm.previousVersion.versionId;
            const culture = $scope.model.node.variants.length > 1 ? vm.currentVersion.language.culture : null;            

            return contentResource.rollback(nodeId, versionId, culture)
                .then(data => {
                    vm.rollbackButtonState = "success";
                    submit();
                }, error => {
                    vm.rollbackButtonState = "error";
                });

        }

        function submit() {
            if($scope.model.submit) {
                $scope.model.submit($scope.model.submit);
            }
        }

        function close() {
            if($scope.model.close) {
                $scope.model.close();
            }
        }

        onInit();

    }

    angular.module("umbraco").controller("Umbraco.Editors.RollbackController", RollbackController);

})();