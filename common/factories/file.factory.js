/** fileFactory
 * @desc deal with attached files to json meta data and file types
 * @version 0.5.10
 */

app.factory('fileFactory', ['http', '$http', 'loginFactory', '$rootScope', 'langFactory', 'dateFactory', function (http, $http, loginFactory, $rootScope, langFactory, dateFactory) {
   var Services = {
      saveFile: saveFile, // fileFactory.saveFile(endPointUrl, file, metaDoc, subCategory, successFunc)

      removeFile: removeFile, // fileFactory.removeFile(endPointUrl, file, successFunc)

      removeAllFiles: removeAllFiles, // fileFactory.removeAllFiles(endPointUrl, files, successFunc)

      downloadFile: downloadFile, // fileFactory.downloadFile(endPointUrl, file)

      openFileIframe: openFileIframe, // fileFactory.openFileIframe(endPointUrl, file, metaDoc, successFunc)

      openFileNewTab: openFileNewTab, // fileFactory.openFileNewTab(endPointUrl, file, metaDoc, successFunc)

      openFileNewWindow: openFileNewWindow, // fileFactory.openFileNewTab(endPointUrl, file, metaDoc, successFunc)

      getFiles: getFiles,

      getFileUrl: getFileUrl, // fileFactory.getFileUrl(endPointUrl, file, metaDoc, forceDownload)

      getFileDownloadUrl: getFileDownloadUrl,

      fileCanBeOpened: fileCanBeOpened, // fileFactory.fileCanBeOpened(file)

      fileFromFiles: fileFromFiles, // returns last file of specific type in files array

      unit8ToArray: unit8ToArray,

      getFirstUsableFile: getFirstUsableFile,

      is: is, // fileFactory.is(file, 'pdf') or fileFactory.is(file, ['pdf', 'image'])

      getSubCategoryFromSection: getSubCategoryFromSection,

      getFileName: getFileName
   };

   function saveFile (endPointUrl, files, metaDoc, subCategory, successFunc, errFunction) {
      var counter = 0;
      metaDoc = metaDoc || {};
      subCategory = subCategory || 'other';

      if (!Array.isArray(files)) files = [files];

      nextFile();

      function nextFile () {
         var file = files[counter];
         saveSingleFile(endPointUrl, file, metaDoc, subCategory, function (data) {
            metaDoc = data;
            counter++;
            if (counter < files.length) {
               nextFile();
            } else {
               successFunc(metaDoc);
            }
         }, errFunction);

      }
   }

   function saveSingleFile (endPointUrl, file, metaDoc, subCategory, successFunc, errFunction) {
      file.filename = file.filename || file.name; // try to prevent missing file.filename
      var headers = {
         fileId: metaDoc._id,
         filename: encodeURIComponent(file.filename),
         extension: file.extension || file.filename.split('.').pop(),
         mimetype: file.mimetype
      };

      if (metaDoc.previewOpts) {
         headers.previewopts = JSON.stringify(metaDoc.previewOpts);
      }

      if (subCategory) headers.subCategory = subCategory;
      http.fileSave(endPointUrl, {
         content: file.contentUint8Array || file.content,
         mimetype: file.mimetype,
         headers: headers
      }, function (response) {
         if (successFunc) successFunc(response);
      }, function (err) {
         if (errFunction) errFunction(err);
         $rootScope.$emit('note_error', err);
      });
   }



   function removeFile (endPointUrl, file, successFunc, opts) {
      var modalData = {
         onSuccess: function () {
            http.post(endPointUrl, file.fileId,
               function (response) {
                  if (successFunc) successFunc(response);
               },
               function (err) {
                  $rootScope.$emit('note_error', err);
               });
         },
         onFailure: function () {}
      };

      opts = opts || {};
      if (opts.confirmText) {
         modalData.confirmText = opts.confirmText;
         $rootScope.$emit('modal', 'confirm-input', 'removeFile', modalData);
      } else {
         $rootScope.$emit('confirm', 'removeFile', modalData);
      }
   }

   function removeAllFiles (endPointUrl, files, successFunc, opts) {
      var modalData = {
         onSuccess: function () {
            deleteRecursiveFiles(endPointUrl, files, successFunc);
         },
         onFailure: function () {}
      };

      opts = opts || {};
      if (opts.confirmText) {
         modalData.confirmText = opts.confirmText;
         $rootScope.$emit('modal', 'confirm-input', 'removeAllFiles', modalData);
      } else {
         $rootScope.$emit('confirm', 'removeAllFiles', modalData);
      }
   }

   function deleteRecursiveFiles (endPointUrl, files, successFunc) {
      if (files.length > 0) {
         http.post(endPointUrl, files[0].fileId,
            function (response) {
               files.shift();
               deleteRecursiveFiles(endPointUrl, files, successFunc);
            },
            function (err) {
               $rootScope.$emit('note_error', err);
            });

      } else {
         if (successFunc) successFunc();
      }
   }

   function downloadFile (endPointUrl, data) {
      var url = getFileDownloadUrl(endPointUrl, data, 'forceDownload');
      window.open(url, '_blank');
   }

   function openFileIframe (endPointUrl, file, metaDoc, successFunc) { // open in an iframe
      var url = getFileUrl(endPointUrl, file, metaDoc, false);
      if (url) { // only if it can be opened
         $rootScope.$broadcast('modal', 'file-viewer', null, {data:
            {endPointUrl: endPointUrl, file: file, metaDoc: metaDoc}});
      }
   }

   function getFiles (endPointUrl, files, successFunc, errFunction) {
      var counter = 0;
      var fileArray = [];
      if (!Array.isArray(files)) files = [files];

      nextFile();

      function nextFile () {
         var file = files[counter];
         getSingleFile(endPointUrl, file, function (data) {
            fileArray.push(data);
            counter++;
            if (counter < files.length) {
               nextFile();
            } else {
               successFunc(fileArray);
            }
         }, errFunction);
      }

      function getSingleFile (endPointUrl, file, callback) {
         $http({
            method: 'GET',
            url: getFileUrl(endPointUrl, file, null, true),
            responseType: 'arraybuffer'
         }).then(function (result) {
            callback({
               filename: file.filename,
               mimetype: file.mimetype,
               content: new Uint8Array(result.data)
            });
         });
      }
   }

   function openFileNewTab (endPointUrl, file, metaDoc, successFunc) {
      var url = getFileUrl(endPointUrl, file, metaDoc);
      if (url) { // only if it can be opened
         window.open(url, '_blank');
      }
   }

   function openFileNewWindow (endPointUrl, file, metaDoc, successFunc, newWindowProperties) {
      var url = getFileUrl(endPointUrl, file, metaDoc);
      var windowName = 'file';
      if (file.filename) windowName += (' ' + file.filename);
      newWindowProperties = newWindowProperties || 'width=600,height=400';

      if (url) { // only if it can be opened
         window.open(url, windowName, newWindowProperties);
      }
   }

   function getFileUrl (endPointUrl, file, metaDoc, forceDownload, noWarning) {

      // remove data binding, as we don't want to change anything here
      file = JSON.parse(JSON.stringify(file));

      if (is(file, 'json')) {
         if (metaDoc) {
            return getCadUrl(JSON.parse(JSON.stringify(metaDoc)));
         } else {
            return true;
         }
      } if (is(file, ['stl', 'step'])) {
         if (forceDownload) {
            return getFileDownloadUrl('drawing-file', file, true);
         } else { // Not force download
            // Opens the viewer in an iframe which will
            // in turn load the actual STL file using our token
            return getFileDownloadUrl('3d.html', file, false).replace('/api', '');
         }
      } else {
         if (forceDownload || is(file, ['pdf', 'image', 'text'])) {
            return getFileDownloadUrl(endPointUrl, file, forceDownload);
         } else {
            if (!noWarning) $rootScope.$emit('note_alert', 'Cannot open fileType ' + file.mimetype);
            return false;
         }
      }
   }

   function getFileDownloadUrl (endPointUrl, data, forceDownload) {
      var tokenURL = loginFactory.getToken();
      data = JSON.parse(JSON.stringify(data)); // prevent modification of the original obj
      data.forceDownload = !!forceDownload;
      var dataURL = encodeURIComponent(JSON.stringify(data));
      return http.getUrl(endPointUrl) + '?data=' + dataURL + '&token=' + tokenURL;
   }

   function getFirstUsableFile (meta) {
      var i = 0;
      var files = meta.files || [];
      var firstUsableFile = null;
      // console.log('getFirstUsableFile', meta);

      // see if one of the file can be opened
      while (i < files.length && !fileCanBeOpened(firstUsableFile)) {
         // console.log('iteration', i, files[i]);
         firstUsableFile = files[i];
         i++;
      }

      return firstUsableFile;
   }

   function fileCanBeOpened (file) {
      if (!file) return false;
      return getFileUrl('drawing-file', file, null, null, 'noWarning');
   }

   // Returns last option
   function fileFromFiles (files, fileType) {
      var selected = {};

      files.forEach(function (file) {
         if (is(file, fileType)) selected = file;
      });

      return selected;
   }

   /*
   // Returns first option
   function fileFromFiles (files, type) {
      files = files || [];
      for (var i = 0; i < files.length; i++) {
         if (is(files[i], type)) return files[i];
      }
      return {};
   }
   */

   function getCadUrl (drawing) {
      var urls = loginFactory.getAppUrls('rf-app-cad');
      var url = urls.main + urls.loadDrawing + drawing.hash;
      url = loginFactory.addTokenToUrl(url);
      return url;
   }

   function unit8ToArray (uint) {
      var chuck = 1024 * 64; // 64kB
      var text = '';
      var len = uint.byteLength;

      // console.log('uint', uint);

      if (len < chuck) {
         text = String.fromCharCode.apply(null, uint);
      } else {
         for (var i = 0; i < (len / chuck); i++) {
            var arr = uint.slice(i * chuck, (i + 1) * chuck);
            text += String.fromCharCode.apply(null, arr);
         }
      }
      // console.log('text', text);

      // conversion is necessary; nodemailer seems to handle only simple arrays
      var content = []; // normal array
      for (i = 0; i < text.length; i++) {
         content.push((text[i]).charCodeAt(0));
      }
      return content;
   }

   function is (file, type) {
      // console.log(file);
      // housekeeping
      if (!file) {
         console.log('file is missing');
         return false;
      }
      if (!type) {
         console.log('type is missing');
         return false;
      }

      if (typeof type === 'string') {
         return is(file, type);
      } else if (Array.isArray(type)) {
         for (var i = 0; i < type.length; i++) {
            if (is(file, type[i])) return true;
         }
         return false;
      }

      function is (file, type) {

         if (!fileTypeComparison[type]) {
            console.log('type ', type, ' not found in ', fileTypeComparison);
            return false;
         }

         // start with the checks
         var compare = fileTypeComparison[type];
         var fileMatches = false;

         // 1. check mimetype
         if (file.mimetype && compare.mimeRegex) {
            fileMatches = !!file.mimetype.match(compare.mimeRegex);
         }


         if (!fileMatches && compare.mimetype) {
            fileMatches = fileMetaCompare(file, 'mimetype', compare.mimetype);
         }

         // 2. try file extension
         if (!fileMatches && compare.extension) {
            fileMatches = fileMetaCompare(file, 'extension', compare.extension);
         }

         return fileMatches;
      }
   }

   function fileMetaCompare (file, fileKey, checkValues) {
      file = file || {};
      fileKey = fileKey || 'mimetype'; // or 'extension'
      if (typeof checkValues === 'string') checkValues = [checkValues];
      var value = file[fileKey];
      if (!value || !checkValues) return false;
      for (var i = 0; i < checkValues.length; i++) {
         if (checkValues[i] === value) return true;
      }
      return false;
   }

   function getSubCategoryFromSection (section) {
      return {
         article: 'otherArticle',
         campaign: 'other',
         incomingInvoice: 'otherIncomingInvoice',
         invoice: 'otherInvoice',
         purchase: 'otherPurchase',
         sale: 'otherSale'
      }[section] || 'other';
   }

   var fileTypeComparison = {
      json: {
         mimetype: ['application/json'],
         extension: ['json', 'JSON']
      },
      pdf: {
         mimetype: ['application/pdf', 'application/x-download'],
         extension: ['pdf', 'PDF']
      },
      image: {
         mimeRegex: /image/
      },
      step: {
         extension: ['step', 'STEP', 'stp', 'STP']
      },
      stl: {
         mimetype: ['model/stl', 'model/x.stl-binary', 'application/sla'],
         extension: 'stl'
      },
      text: {
         mimeRegex: /text/,
         extension: ['txt', 'cnc']
      }
   };

   function getFileName (nameKey, ending) {
      var filename = langFactory.translate(nameKey).replaceAll(' ', '-');
      return filename + '_' + dateFactory.getDateStringForFileName() + '.' + ending;
   }

   return Services;

}]);
