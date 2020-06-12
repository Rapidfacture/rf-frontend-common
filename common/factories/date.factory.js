/**
 * @module dateFactory
 * @version 0.1.3
 */

app.factory('dateFactory', [function () {
   function _formatDate (date) { // helper function to build date strings
      if (_isDate(date)) {
         date = new Date(date);
      } else {
         date = new Date();
      }

      var today = new Date(date),
         day = today.getDate(),
         month = today.getMonth() + 1, // january is 0
         year = today.getFullYear();

      if (day < 10) {
         day = '0' + day;
      }

      if (month < 10) {
         month = '0' + month;
      }

      return {
         dd: day,
         mm: month,
         yy: year.toString().substr(-2),
         yyyy: year
      };
   }

   function _isDate (date) { // validate a Date
      var newDate = new Date(date);
      return (newDate !== 'Invalid Date' && !isNaN(newDate));
   }

   return {
      getDateStringWithDots: function (date) { // return:  02.10.2018
         date = new Date(date);
         var formatedDate = _formatDate(date);
         return (formatedDate.dd + '.' + formatedDate.mm + '.' + formatedDate.yyyy);
      },
      getMonth: function (date) { // return:  February
         date = new Date(date);
         var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
         return (monthNames[date.getMonth()]);
      },
      getDateStringForFileName: function (date) { // return:  181002
         var formatedDate = _formatDate(date);
         return (formatedDate.yyyy.toString().substring(2, 4) + formatedDate.mm + formatedDate.dd);
      },
      getDateFromObjectId: function (objectId) { // return:  Date
         return new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
      },
      getDateStringFromObjectId: function (objectId) { // return:  02.10.2018
         var date = new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
         var formatedDate = _formatDate(date);
         return (formatedDate.dd + '.' + formatedDate.mm + '.' + formatedDate.yyyy);
      },
      dateInThePast: function (milliSecsInThePast) { // return:  Date   x milliseconds ago
         return new Date(new Date().getTime() - milliSecsInThePast);
      },
      isDate: _isDate,
      formatDate: _formatDate
   };
}

]);
