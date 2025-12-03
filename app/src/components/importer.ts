function importWallet(files, $scope, $mdToast, localKeyStore: LocalKeyStoreService, walletFile) {

    processFile(files)

    let doAfterImport = () => {
        setTimeout(() => window.location.reload(), 6000)
        $mdToast.show($mdToast.simple().textContent('Data is imported. The app will now restart...').hideDelay(7000))
    }

    function processFile(files) {
        if (files && files[0]) {
            let file = files[0]
            let reader = new FileReader()
            reader.onload = (e) => {
                $scope.$evalAsync(() => {
                    let fileContents = reader.result
                    let data = walletFile.parseJSON(<string>fileContents)
                    let p = Promise.resolve(null)
                    if (!data) return
                    if (data["heatwallet-raw-data"]) {
                        p = p.then(s => walletFile.importRawData(data) + ".  The app will now restart...").then(() => {
                            for (let key in localStorage) {
                                if (key.startsWith('heatwallet-db-converted')) {
                                    localStorage.removeItem(key)
                                }
                            }
                        })
                        setTimeout(() => window.location.reload(), 4000)
                    } else if (data['entries'] && data['version']) {
                        let wallet = walletFile.createFromText(data)
                        if (wallet) {
                            p = p.then(s => {
                                return localKeyStore.import(wallet).then(addedKeys => {
                                    let isBig = addedKeys.length > 8
                                    let report = (isBig ? addedKeys.filter((value, index) => index < 7) : addedKeys)
                                        .map(v => v.account + (v.name ? "[" + v.name + "]" : ""))
                                        .join(", ")
                                    if (isBig) report = report + "\n..."
                                    $mdToast.show($mdToast.simple().textContent(
                                        `Imported ${addedKeys.length} keys into this device: \n ${report}`
                                    ).hideDelay(7000))
                                    doAfterImport()
                                }).catch(reason => {
                                    console.error(reason)
                                    return `Error on processing file content: ${reason}`
                                })
                            })
                        }
                    } else if (data['formatName'] == 'dexie') {
                        importDatabaseFile(file, fileContents)
                    } else {
                        return 'Invalid wallet file'
                    }
                    p.then(s => {
                        if (s) $mdToast.show($mdToast.simple().textContent(s).hideDelay(7000))
                    })
                })
            }
            reader.readAsText(file)
        }
    }

    function importDatabaseFile(file, fileContent) {
        const blob = new Blob([fileContent], {type: file.type})
        let displayError = (reason) => {
            let s = `Error ${reason}`
            $mdToast.show($mdToast.simple().textContent(s).hideDelay(12000))
        }

        // before adding new records remove records that very likely lead to constraint error.
        // It allows to add imported data to existing wallet entries if there are no equal entries.
        db.removeValue('fileVersion').then(() => {
            db.importDatabase(blob)
                .then(doAfterImport)
                .catch(reason => {
                    if (reason?.failures?.length > 0 && reason?.failures[0].name.indexOf('ConstraintError') > -1) {
                        dialogs.confirm('Import wallet database',
                            'Detected not empty database in this app. It will be cleared and filled from the file').then(() => {
                            db.deleteDatabase().then(() => db.importDatabase(blob)).then(() => {
                                doAfterImport()
                            }).catch(reason => displayError(reason))
                        })
                    } else {
                        displayError(reason)
                    }
                })
        })

    }

}
