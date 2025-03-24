//"use strict"
const gulp = require('gulp')
require('./gulpfile')

const builder = require("electron-builder")
const Platform = builder.Platform
const fs = require('fs-extra')
const glob = require("glob")

const Os = require('os')

main()

async function main() {
  try {
    await buildApp()
    await updateFiles(await findHeatBundleFile())
    await buildElectron()
  } catch (e) {
    console.error(e)
  }
}

async function buildApp() {
  console.log("start app build ...")
  fs.removeSync('./dist')
  return new Promise((resolve, reject) => gulp.series('build', 'electron', () => resolve(), (err) => console.error(err))())
      .then(() => console.log("done app build\n"))
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
  await updateVersionFile()

  const version = fs.readFileSync("./VERSION").toString().trim()
  const heatledgerVersionContent = fs.readFileSync("../heatledger/conf/VERSION").toString().trim().split("\n")
  const heatledgerVersion = heatledgerVersionContent[0].trim()
  const heatledgerBuildDate = heatledgerVersionContent[1]
      ? new Date(parseInt(heatledgerVersionContent[1].trim())).toISOString().split('T')[0]
      : ""
  const buildDate = new Date().toISOString().split('T')[0]

  await replaceStrInFile("dist/index.html", [
    ["%BUILD_OVERRIDE_VERSION%", version],
    ["%BUILD_OVERRIDE_LAST_MODIFIED%", buildDate]
  ])

  await replaceStrInFile(heatBundleFile, [
      ["%BUILD_OVERRIDE_VERSION%", version],
      ["%BUILD_OVERRIDE_HEATLEDGER_VERSION%", heatledgerVersion],
      ["%BUILD_OVERRIDE_HEATLEDGER_BUILD_DATE%", heatledgerBuildDate],
      ["%BUILD_OVERRIDE_BUILD%", buildDate],
      ["%BUILD_OVERRIDE_LAST_MODIFIED%", buildDate]
  ])
}

/**
 * Increase last number in version string and update version file with new version value.
 */
async function updateVersionFile() {
  const f = "./VERSION"
  const version = fs.readFileSync(f).toString().trim()

  //update number in last part of version
  let lastPart = version.substring(version.indexOf(" ") + 1)
  let lastNumStr = lastPart.replace(/\D/g,'')
  let newLastNum = parseInt(lastNumStr) + 1
  let newLastPart = lastPart.replaceAll(lastNumStr, newLastNum)
  let newVersion = version.replaceAll(lastPart, newLastPart)

  await replaceStrInFile(f, [[version, newVersion]])
  return newVersion
}

async function replaceStrInFile(file, replacements) {
  if (!Array.isArray(replacements)) throw new Error("Parameter is not an array")
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', function (err, data) {
      if (err) return reject(err)
      let result = data
      for (const replacement of replacements) {
        if (!Array.isArray(replacement)) throw new Error("Parameter is not an array")
        result = result.replaceAll(replacement[0], replacement[1])
      }
      fs.writeFile(file, result, 'utf8', function (err) {
        if (err) reject(err)
        resolve()
      });
    });
  })
}

async function buildElectron() {
  /*
  previous commands (from release.sh):
  with embedded server
  node.exe node_modules/electron-builder/out/cli/cli.js --linux --x64
  without embedded server
  node.exe node_modules/electron-builder/out/cli/cli.js --linux --x64 --c.extraResources=[]
  node.exe node_modules/electron-builder/out/cli/cli.js --win --x64
   */

  let artifactNameSuffix
  let targets = []
  if (Os.platform() === 'linux') {
    targets.push(Platform.LINUX)
    artifactNameSuffix = "linux_${version}.${ext}"
  }
  if (Os.platform() === 'win32') {
    targets.push(Platform.WINDOWS)
    artifactNameSuffix = "setup_${version}.${ext}"
  }
  if (Os.platform() === 'darwin') {
    targets.push(Platform.MAC)
    artifactNameSuffix = "MacOS_${version}.${ext}"
  }


  let config = {
    "appId": "com.heatledger.heatwallet",
    "copyright": "Copyright © 2024 HEAT",
    "productName": "Heatwallet",
    "compression": "normal",
    "artifactName": "heatclient_" + artifactNameSuffix,
    "extraResources": [],
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

  let configWithEmbeddedServer = Object.assign(Object.assign({}, config), {
    "artifactName": "heatwallet_" + artifactNameSuffix,
    "extraResources": [
      {
        "from": "../heatledger/build/install/heatledger",
        "to": "heatledger"
      }
    ]
  })

  console.log("start electron build...")
  fs.removeSync('./releases')

  try {

    await builder.build({
      targets: builder.createTargets(targets),
      config: config
    })

    console.log("done desktop app build")

    await builder.build({
      targets: builder.createTargets(targets),
      config: configWithEmbeddedServer
    })

    console.log("done desktop app with embedded server build")

  } catch (e) {
    console.error(error)
  }

}
