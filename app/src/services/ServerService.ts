/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Heat Ledger Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
declare var __dirname: any;
@Service('server')
@Inject('$rootScope','$q','$interval','$timeout')
class ServerService extends EventEmitter {
  private MAX_CONSOLE_LINE_LENGTH = 10000;
  public isRunning: boolean = false;
  public isReady: boolean = false;
  public pid: string;
  private command: string;
  private cwd: string;
  private childProcess: any;
  public buffer: Array<string> = [" "]; // needs one empty line or last line is not shown in console

  constructor(private $rootScope: angular.IRootScopeService,
              private $q: angular.IQService,
              private $interval: angular.IIntervalService,
              private $timeout: angular.ITimeoutService) {
    super();
    window.onbeforeunload = () => {
      if (this.isRunning) {
        this.applicationShutdown().then(() => {
          window.close();
        });
        $timeout(() => {
          this.stopServer();
        }, 2000);
        return "dont close";
      }
    };
  }

  initOsDepends() {
    var os = this.getOS();
    var path = require('path');
    if (os == 'WIN')  {
      this.cwd = path.join(__dirname,'..','heatledger');
      this.command = path.join('bin','heatledger.bat');
    }
    if (os == 'MAC') {
      this.cwd = path.join(__dirname,'..','heatledger');
      this.command = path.join('bin','heatledger');
    }
    if (os == 'LINUX') {
      this.cwd = path.join(__dirname,'..','heatledger');
      this.command = path.join('bin','heatledger');
    }
  }

  startServer() {
    if (this.isRunning) {
      throw new Error('Server starting or already up, check server.isRunning before calling this method');
    }
    this.initOsDepends();
    var spawn = require('child-process-promise').spawn;
    this.isRunning = true;
    var promise = spawn(this.command,[],{cwd:this.cwd});
    this.childProcess = promise.childProcess;
    console.log('[spawn] childProcess.pid: ', this.childProcess.pid);
    this.childProcess.stdout.on('data', (data) => {
      this.log(data.toString());
    });
    this.childProcess.stderr.on('data', (data) => {
      this.log(data.toString());
    });

    promise.then(() => {
      this.log("[SPAWN] done!");
      this.$rootScope.$evalAsync(()=>{
        this.isRunning = false;
        this.isReady = false;
      })
    })
    .catch((err) => {
      this.log("[ERROR] ERROR err", err);
      this.$rootScope.$evalAsync(()=>{
        this.isRunning = false;
        this.isReady = false;
      })
    });
  }

  log(msg, error?:any) {
    if ((!msg || msg.trim().length == 0) && !error) return;
    if (error)
      console.log(msg,error);
    else
      console.log(msg);
    if (!this.isReady) {
      if (msg.indexOf('** HEATLEDGER SERVER READY **')!=-1) {
        this.$rootScope.$evalAsync(()=>{
          this.isReady = true;
        });
      }
    }
    this.buffer.splice(this.buffer.length-1, 0, msg); // must add at index 1 before last to keep last line for proper console display
    if (this.buffer.length > this.MAX_CONSOLE_LINE_LENGTH) {
      this.buffer.splice(0, this.buffer.length - this.MAX_CONSOLE_LINE_LENGTH);
    }
    this.emit('output');
  }

  stopServer() {
    if (!this.isRunning) {
      throw new Error('Server already stopped, check server.isRunning before calling this method');
    }
    this.childProcess.kill();
  }

  private getOS() {
    if (navigator.appVersion.indexOf("Win")!=-1) return 'WIN';
    if (navigator.appVersion.indexOf("Mac")!=-1) return 'MAC';
    if (navigator.appVersion.indexOf("X11")!=-1) return 'LINUX';
    if (navigator.appVersion.indexOf("Linux")!=-1) return 'LINUX';
      throw new Error('Could not detect OS');
  }

  applicationShutdown() {
    var deferred = this.$q.defer();
    var dialog = dialogs.shutdown(null);
    this.$interval(() => {
      if (!this.isRunning) {
        deferred.resolve();
      }
    }, 2000);
    return deferred.promise;
  }
}