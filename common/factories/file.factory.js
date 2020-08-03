/** fileFactory
 * @desc deal with attached files to json meta data and file types
 * @version 0.5.9
 */

app.factory('fileFactory', ['http', '$http', 'loginFactory', '$rootScope', function (http, $http, loginFactory, $rootScope) {
   var Services = {
      saveFile: _saveFile, // fileFactory.saveFile(endPointUrl, file, metaDoc, apptype, successFunc)

      removeFile: _removeFile, // fileFactory.removeFile(endPointUrl, file, successFunc)

      downloadFile: _downloadFile, // fileFactory.downloadFile(endPointUrl, file)

      openFileIframe: _openFileIframe, // fileFactory.openFileIframe(endPointUrl, file, metaDoc, successFunc)

      openFileNewTab: _openFileNewTab, // fileFactory.openFileNewTab(endPointUrl, file, metaDoc, successFunc)

      openFileNewWindow: _openFileNewWindow, // fileFactory.openFileNewTab(endPointUrl, file, metaDoc, successFunc)

      getFiles: _getFiles,

      getFileUrl: _getFileUrl, // fileFactory.getFileUrl(endPointUrl, file, metaDoc, forceDownload)

      getFileDownloadUrl: _getFileDownloadUrl,

      fileCanBeOpened: fileCanBeOpened, // fileFactory.fileCanBeOpened(file)

      fileFromFiles: _fileFromFiles, // returns last file of specific type in files array

      unit8ToArray: _unit8ToArray,

      getFirstUsableFile: _getFirstUsableFile,

      fileFromFiles: _fileFromFiles,

      is: _is // fileFactory.is(file, 'pdf') or fileFactory.is(file, ['pdf', 'image'])
   };

   function _saveFile (endPointUrl, files, metaDoc, apptype, successFunc, errFunction) {
      var counter = 0;
      metaDoc = metaDoc || {};
      if (!Array.isArray(files)) files = [files];

      nextFile();

      function nextFile () {
         var file = files[counter];
         _saveSingleFile(endPointUrl, file, metaDoc, apptype, function (data) {
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

   function _saveSingleFile (endPointUrl, file, metaDoc, apptype, successFunc, errFunction) {
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

      if (apptype) headers.apptype = apptype;
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



   function _removeFile (endPointUrl, file, successFunc, opts) {
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

   function _downloadFile (endPointUrl, data) {
      var url = _getFileDownloadUrl(endPointUrl, data, 'forceDownload');
      window.open(url, '_blank');
   }

   function _openFileIframe (endPointUrl, file, metaDoc, successFunc) { // open in an iframe
      var url = _getFileUrl(endPointUrl, file, metaDoc, false);
      if (url) { // only if it can be opened
         $rootScope.$broadcast('modal', 'file-viewer', null, {data:
            {endPointUrl: endPointUrl, file: file, metaDoc: metaDoc}});
      }
   }

   function _getFiles (endPointUrl, files, successFunc, errFunction) {
      var counter = 0;
      var fileArray = [];
      if (!Array.isArray(files)) files = [files];

      nextFile();

      function nextFile () {
         var file = files[counter];
         _getSingleFile(endPointUrl, file, function (data) {
            fileArray.push(data);
            counter++;
            if (counter < files.length) {
               nextFile();
            } else {
               successFunc(fileArray);
            }
         }, errFunction);
      }

      function _getSingleFile (endPointUrl, file, callback) {
         $http({
            method: 'GET',
            url: _getFileUrl(endPointUrl, file, null, true),
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

   function _openFileNewTab (endPointUrl, file, metaDoc, successFunc) {
      var url = _getFileUrl(endPointUrl, file, metaDoc);
      if (url) { // only if it can be opened
         window.open(url, '_blank');
      }
   }

   function _openFileNewWindow (endPointUrl, file, metaDoc, successFunc, newWindowProperties) {
      var url = _getFileUrl(endPointUrl, file, metaDoc);
      var windowName = 'file';
      if (file.filename) windowName += (' ' + file.filename);
      newWindowProperties = newWindowProperties || 'width=600,height=400';

      if (url) { // only if it can be opened
         window.open(url, windowName, newWindowProperties);
      }
   }

   function _getFileUrl (endPointUrl, file, metaDoc, forceDownload, noWarning) {

      // remove data binding, as we don't want to change anything here
      file = JSON.parse(JSON.stringify(file));

      if (_is(file, 'json')) {
         if (metaDoc) {
            return _getCadUrl(JSON.parse(JSON.stringify(metaDoc)));
         } else {
            return true;
         }
      } if (_is(file, ['stl', 'step'])) {
         if (forceDownload) {
            return _getFileDownloadUrl('drawing-file', file, true);
         } else { // Not force download
            // Opens the viewer in an iframe which will
            // in turn load the actual STL file using our token
            return _getFileDownloadUrl('3d.html', file, false).replace('/api', '');
         }
      } else {
         if (forceDownload || _is(file, ['pdf', 'image', 'text'])) {
            return _getFileDownloadUrl(endPointUrl, file, forceDownload);
         } else {
            if (!noWarning) $rootScope.$emit('note_alert', 'Cannot open fileType ' + file.mimetype);
            return false;
         }
      }
   }

   function _getFileDownloadUrl (endPointUrl, data, forceDownload) {
      var tokenURL = loginFactory.getToken();
      data = JSON.parse(JSON.stringify(data)); // prevent modification of the original obj
      data.forceDownload = !!forceDownload;
      var dataURL = encodeURIComponent(JSON.stringify(data));
      return http.getUrl(endPointUrl) + '?data=' + dataURL + '&token=' + tokenURL;
   }

   function _getFirstUsableFile (meta) {
      var i = 0;
      var files = meta.files || [];
      var firstUsableFile = null;
      // console.log('_getFirstUsableFile', meta);

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
      return _getFileUrl('drawing-file', file, null, null, 'noWarning');
   }

   function _fileFromFiles (files, fileType) {
      var selected = {};

      files.forEach(function (file) {
         if (_is(file, fileType)) selected = file;
      });

      return selected;
   }

   function _getCadUrl (drawing) {
      var urls = loginFactory.getAppUrls('rf-app-cad');
      var url = urls.main + urls.loadDrawing + drawing.hash;
      url = loginFactory.addTokenToUrl(url);
      return url;
   }

   function _unit8ToArray (uint) {
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

   function _fileFromFiles (files, type) {
      files = files || [];
      for (var i = 0; i < files.length; i++) {
         if (_is(files[i], type)) return files[i];
      }
      return {};
   }


   function _is (file, type) {
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
            fileMatches = _fileMetaCompare(file, 'mimetype', compare.mimetype);
         }

         // 2. try file extension
         if (!fileMatches && compare.extension) {
            fileMatches = _fileMetaCompare(file, 'extension', compare.extension);
         }

         return fileMatches;
      }
   }

   function _fileMetaCompare (file, fileKey, checkValues) {
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

   return Services;

}]);
