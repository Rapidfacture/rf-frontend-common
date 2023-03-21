/** button with further options in select
 *
 *
 * @version 0.0.5
 *
 * @example ng-model holds array of objects with functions to call
 *     <rf-action-select ng-model="functions"></rf-tag-select>
 *
 *     <rf-action-select ng-model="functions" data="order"></rf-tag-select>
 *
 *     <rf-action-select ng-model="functions" data="order" responsive="true"></rf-tag-select>
 *
 *     <rf-action-select ng-model="functions" callback="callbackFunktion" show-options="option"></rf-tag-select>
 *
 **/
app.directive('rfActionSelect', ['langFactory', '$timeout', 'helperFactory', function (langFactory, $timeout, helperFactory) { // save json drawing
   return {
      restrict: 'E',
      require: 'ngModel',
      scope: {
         ngModel: '=',
         data: '=',
         onToggle: '=?',
         showOptions: '=?'
      },
      templateUrl: 'global/common/directives/actionSelect/template.html',
      link: function ($scope, elem, attr, ctrl) {
         $scope.mainFunction = null;
         $scope.iconFunctions = [];
         $scope.otherFunctions = [];
         $scope.ngModel = $scope.ngModel || [];
         $scope.responsive = !!attr.responsive;
         var rowHeight = 30;

         $scope.$on('languageSet', function (meta, lang) { // reload on change
            refreshFunctions();
         });

         $scope.selectFunction = function (item) {
            if (item.status === 'disabled') return;

            item.function($scope.data);
            closeDropdown();
         };

         function refreshFunctions () {
            var options = $scope.ngModel.slice(0);
            options = options.sort(function (a, b) {
               if (a.status === 'active' && b.status !== 'active') return -1;
               if (!a.status && b.status === 'disabled') return -1;
               if (a.status === 'disabled' && b.status !== 'disabled') return 1;
               return 0;
            });

            $scope.iconFunctions = [];
            $scope.otherFunctions = [];
            $scope.mainFunction = {};
            var mainItemIndex = 0;

            options.forEach(function (item, index) {
               item.translation = langFactory.translate(item.label);
               if (item.elemNumber) item.translation += item.elemNumber;

               if (item.icon) {
                  $scope.iconFunctions.push(item);
               } else if (Object.keys($scope.mainFunction).length === 0) {
                  $scope.mainFunction = item;
                  mainItemIndex = index;
               } else {
                  $scope.otherFunctions.push(item);
               }
            });

            if (attr.hasOwnProperty('dynamicWidth')) {
               var minWidth = 220;

               var widths = $scope.ngModel.map(function (item) {
                  return getTextWidth(item.translation.length);
               });

               var maxItemWidth = Math.max.apply(null, widths);
               var mainItemWidth = widths[mainItemIndex];
               var paddingOffset = 45;

               if (maxItemWidth < minWidth) maxItemWidth = minWidth;

               $scope.dynamicWidthDropDown = maxItemWidth + 'px';
               $scope.dynamicWidth = (mainItemWidth + paddingOffset) + 'px';
            }

         }

         function getTextWidth (charLength) {
            var fontSize = getFontSize();
            var pixelMultiplier;

            switch (fontSize) {
               case '12px':
                  pixelMultiplier = 5.9;
                  break;

               default:
                  pixelMultiplier = 6.7;
                  break;
            }

            return charLength * pixelMultiplier;
         }

         function getFontSize () {
            var div = elem[0].querySelector('.select-row.pointer.first');
            return window.getComputedStyle(div).fontSize;
         }

         $scope.toggle = function () {
            $scope.showOptions = !$scope.showOptions;
            if ($scope.onToggle) $scope.onToggle();
            // console.log(getSpaceToBottom(), calculateMenuHeight());
            $scope.verticalDirection = (getSpaceToBottom() < calculateMenuHeight()) ? 'inverted' : 'regular';
         };

         function closeDropdown () {
            $timeout(function () { $scope.showOptions = false; });
         }

         function calculateMenuHeight () {
            var height = 0;
            if ($scope.iconFunctions.length > 0) height += 60;
            $scope.otherFunctions.forEach(function () { height += rowHeight; });
            return height;
         }

         function getSpaceToBottom () {
            var uppercontainer = elem[0];
            var menuStartY = uppercontainer.getBoundingClientRect().top + rowHeight;
            return window.innerHeight - menuStartY;
         }

         var removeListener = new helperFactory.elemOutsideClickListener(elem[0], closeDropdown);
         $scope.$on('$destroy', removeListener);


         ctrl.$formatters.unshift(function (value) { // ngModel set external from code => refresh
            // checks if not undefined to prevent showing current date
            if (value) refreshFunctions();
         });

         // if there is no change - force refresh; needed in e2e on server
         $timeout(refreshFunctions, 1000);
      }
   };
}]);
