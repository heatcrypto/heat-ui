//"use strict"
var gulp = require('gulp')
require('./gulpfile')

const builder = require("electron-builder")
const Platform = builder.Platform
const fs = require('fs-extra')
const glob = require("glob")

main()

async function main() {
  try {
    await buildApp()
    await updateFiles(await findHeatBundleFile())
    buildElectron()
  } catch (e) {
    console.error(e)
  }
}

async function buildApp() {
  console.log("start app build ...")
  fs.removeSync('./dist')
  return new Promise((resolve, reject) => gulp.series('build', 'electron', () => resolve(), (err) => console.error(err))())
    .then(() => console.log("done app build"))
}

function findHeatBundleFile() {
  return new Promise((resolve, reject) => {
    glob("dist/heat-ui-*.js", function (err, files) {
      if (err) return reject(err)
      if (files && files.length > 0) {
        resolve(files[0])
      } else {
        reject('not found "dist/heat-ui-*.js"')
      }
    })
  })
}

async function updateFiles(heatBundleFile) {
  const version = fs.readFileSync("./VERSION").toString().trim()
  const heatledgerVersion = fs.readFileSync("../heatledger/conf/VERSION").toString().trim()
  const now = new Date()

  await replaceStrInFile("dist/index.html", "%BUILD_OVERRIDE_VERSION%", version)
  await replaceStrInFile("dist/index.html", "%BUILD_OVERRIDE_LAST_MODIFIED%", now.toUTCString())
  await replaceStrInFile(heatBundleFile, "%BUILD_OVERRIDE_VERSION%", version)
  await replaceStrInFile(heatBundleFile, "%BUILD_OVERRIDE_HEATLEDGER_VERSION%", heatledgerVersion)
  await replaceStrInFile(heatBundleFile, "%BUILD_OVERRIDE_BUILD%", now.getTime())
  await replaceStrInFile(heatBundleFile, "%BUILD_OVERRIDE_LAST_MODIFIED%", now.toUTCString())
}

async function replaceStrInFile(file, str, replacement) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', function (err, data) {
      if (err) return reject(err)
      const re = new RegExp(str, 'g')
      let result = data.replace(re, replacement)
      fs.writeFile(file, result, 'utf8', function (err) {
        if (err) reject(err)
        resolve()
      });
    });
  })
}

function buildElectron() {
  /*
  previous commands (from release.sh):
  with embedded server
  node.exe node_modules/electron-builder/out/cli/cli.js --linux --x64
  without embedded server
  node.exe node_modules/electron-builder/out/cli/cli.js --linux --x64 --c.extraResources=[]
  node.exe node_modules/electron-builder/out/cli/cli.js --win --x64
   */
  console.log("start electron build...")
  fs.removeSync('./releases')
  builder.build({
    targets: builder.createTargets([Platform.LINUX, Platform.WINDOWS]),
    //mac: ["default"],
    //linux: ["appimage:x64"],
    //win: ["nsis"],
    //targets: Platform.LINUX.createTarget(/*"portable"*/),
    config: {
      "appId": "com.heatledger.heatwallet",
      "copyright": "Copyright © 2019 HEAT",
      "productName": "Heatwallet",
      "compression": "normal",
      "extraResources": [
        {
          "from": "../heatledger/build/install/heatledger",
          "to": "heatledger"
        }
      ],
      "extraFiles": [
        {
          "from": "./dist/app-config.json",
          "to": "app-config.json"
        }
      ],
      "win": {
        "target": [
          "nsis"
        ]
      },
      "linux": {
        "target": [
          "zip"
        ]
      },
      "mac": {
        "icon": "app/electron/icon.png.icns",
        "category": "public.app-category.finance",
        "target": [
          "zip"
        ]
      },
      "directories": {
        "output": "releases",
        "app": "dist"
      }
    }
  }).then(() => {
    console.log("done electron build")
  }).catch((error) => {
    console.error(error)
  })
}

