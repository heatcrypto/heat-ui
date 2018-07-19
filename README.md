![Heat Ledger logo](http://i.imgur.com/rvQ8XR4.png "Heat Ledger logo")

# Heat Ledger Client Framework
In this `README` you will find step by step instructions to get up and running developing **heat-ui** applications.
Heat-ui framework is a complete end to end development setup.

In heat-ui you find:

- **Visual Studio Code** configuration and setup
- **TypeScript** configuration for Visual Studio Code
- Full **code completion** for all Angular, Angular Material and all our own code
- **Gulp development and build** setup
- **Gulp TypeScript** configurations
- Local **development server** TypeScript bindings
- TypeScript client side services
  1. **cryptography**
  2. networking, **real-time push pull and pubsub**
  3. byte/binary support (**object mappers**)
  4. **user/key** management
  5. **settings** framework (with ui bindings)
  6. create, inspect or verify **HEAT Ledger transactions**
- UI components
  1. **real-time update** on web socket events
  2. **advanced dialog support** (standard, input, multi page wizard)
  3. **auto complete** support (see server results as you type)
- Angular Material and the **Google Material Design** rules
- Coded in **Angular 2 style** :sunglasses:
- **Bootstrapper** that injects Angular 2 compatible `Component`, `Service`, `Inject` (and others) TypeScript decorators.
- High **compatibility with Angular 2** through our very own **Angular 1 to Angular 2 bridge**

## Note

At Heat Ledger Ltd we currently do our client and server development on Debian/Ubuntu desktops, we find it to be an excellent open source free! and secure platform. While we try and help new developers coming to heat-ui as best as possible, it is unfortunately not possible to include detailed step by step instructions for platforms that are not Debian based. Looking at you here Windows and Mac.

In time it is our goal to include detailed step by step instructions for all platforms. So if you are using heat-ui and you are on Windows or Mac? Please be so kind to record the steps that it involved and provide those to us so we can share them with any other new user/developer that comes after you.

That said, we will be including links to documents describing the various steps for all supported platforms.

## Installation

To get started developing heat-ui applications you really need your own copy of heat-ui. Easiest is to simply git clone the repo. This way you have everything in place to share back changes you made to heat-ui and to easily download upstream changes to heat-ui to your local development copy.

To clone heat-ui to your own machine open a terminal and `cd` to where you want your heat-ui folder to appear. Now type the following to clone heat-ui.

`git clone https://github.com/Heat-Ledger-Ltd/heat-ui.git`

### Visual Studio Code

Visual Studio Code is a Microsoft Open Source project that provides you with a cross platform (Windows, Linux, Mac) free advanced development suite. It offers a file explorer, debugging support, git integration and excellent support for the Open Source Microsoft TypeScript language.

![VS Code screenshot](http://i.imgur.com/43Yp5zV.png "VS Code screenshot")

One of the main reasons why creating applications with heat-ui goes so fast is because of the powerfull tooling provided by Visual Studio Code and it's of TypeScript. Unlike any other Javascript application you've made before, through VS Code we get the same productivity boost one finds when using an IDE for Java, C++, C# or any other strongly typed language.

Please go ahead to https://code.visualstudio.com and install the latest version for your platform.

### Node-JS

Heat-ui makes extensive use of nodejs. We use if for dependency managemnt, to power our builds and to assist in development through auto-recompiling and to power up your local development server.

Complete installation instructions for nodejs are out of the scope of this document since those instructions depend largely on the platform you are on.

Windows and Mac users please look at anyone of these links:

- https://www.google.com/search?q=how+to+install+nodejs (GIYF)
- https://howtonode.org/how-to-install-nodejs

Debian/Ubuntu users please follow these steps

```
sudo apt-get update
sudo apt-get install nodejs
sudo apt-get install npm
```

### Gulp

Heat-ui uses http://gulpjs.com/ as its main build tool, we prefer gulp over its rivals because of the speed it offers. The streaming and paralel architecture of gulp allows us to perform builds almost instantly, together with the strong error checking in Visual Studio Code and the instant feedback development goes a lot faster than standard JavaScript apps.

Follow these steps to install gulp requirements.

```
npm install --global gulp-cli
```

### Auto install dependencies

Now that you have nodejs, npm and gulp installed we can initialize all heat-ui development tools and dependent libraries by running the provided `package.json` with npm.

Installing the dependencies

```
cd /my/path/to/heat-ui
npm install
```

The initial installation of all dependencies could take a while, several minutes.

### Start the development server

Heat-ui comes with a fully configured development server, the server auto compiles from TypeScript to Javascript whenever you change a file. The development server allows you to access your compiled app at a localhost address, straight from your browser. Hit refresh to load your latest changes.

To start the development server

```
cd /my/path/to/heat-ui
gulp play
```

Now to access your app go to

http://localhost:9001/dist

We recommend using Goolgle Chrome Debugger which comes with Chrome to inspect any running code. Since browsers don't understand TypeScript it had to be compiled to JavaScript. To still be able to find the TypeScript line on which a JavaScript error occured, the console uses source maps that map the TypeScript to the JavaScript.

### Building desktop versions

Heat-ui uses Electron from Github to provide users with an installable desktop application. Electron and therefor heat-ui works on all modern operating systems. (Fun fact, Visual Studio Code is also built on Electron).

To build the actual desktop releases we use https://github.com/electron-userland/electron-packager. Note that you need Node.js > 4.0 to use electron-packager.

Examples:

```
# To build a windows package
$ electron-packager ./dist --platform=win32 --arch=x64

# To build a linux package
$ electron-packager ./dist --platform=linux --arch=x64
```

### Native operating system installer/updater

Heat-ui desktop edition comes with installers for Windows, Mac and Linux.

https://github.com/electron-userland/electron-builder

```
npm install electron-builder --save-dev
```

When building on Linux look here for dependencies https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build#linux

### Links

https://github.com/sindresorhus/awesome-electron.

### Development

As said AngularJS is what we use under the hood together with Angular Material. You would need to be familiar with these frameworks in order to work on heat-ui.

There are several other constructs you need to be familiar with in order to do development on this code base.

We'll go over them one by one.

#### Services

Services are what we consider to be singleton object instances, we declare services in `app/src/services` and they all have the
same general structure.

```typescript
@Service('foo')
@Inject('$q', '$mdToast')
class FooService {
  constructor(private $q: angular.IQService,
              private $mdToast: angular.material.IToastService) {}
}
```

A service is a TypeScript class with the @Service annotation, the name given to the annotation is how the we identify the service later on. A reference to a services can be obtained in either of two ways.

The preferred way is to use dependency injection (through the @Inject annotation).

An alternative way which can be used in situations where no dependency injection is possible is to use the global `heat` property. To use that do something like this: `let $q = heat.$inject.get('$q');` now $q holds a reference to the Q service.

#### Dependency Injection

To inject dependencies (mostly Application Services but also Angular or Material services) we use the @Inject annotation.

It works as follows, if you create either a @Component or a @Service and want to access other services you will add an @Inject annotation and pass it the list of service identifiers you want to access.

Now you edit the constructor of your class and prepare it to receive every injected service as an argument. This is shown in the FooService example shown above.

#### Components

An important aspect of heat-ui is the use of components, components are declared in `app/src/components`. To create a component we create a class and add to it the @Component annotation.

Since we wrote heat-ui at a stage when Angular 2 was still in early development we could already adopt the coding style of Angular 2. If you'd look at [Angular 2 components](https://angular.io/api/core/Component) you will find that our implementation tries to mimic that, somewhat.

Important to understand here is that heat-ui components are in reality angular directives, if you would look in `app/src/decorators.ts` you would find that the [@Component](https://github.com/Heat-Ledger-Ltd/heat-ui/blob/master/app/src/decorators.ts#L35) annotation will generate a directive for you based on the parameters you provide to the @Component. When in doubt how to use a @Component annotation look in decorators.ts to see how we map the inputs to the directive inputs.

A component allows you to create a standalone content type, a new HTML tag so to say. The component is a way of combining both the logic and the display/contents through the use of including Code, CSS and HTML.

An example, this creates a component named foo:

```TypeScript
@Component({
  selector: 'foo',
  template: `
    <div>
      <h2>Foo Component</h2>
      <button ng-click="vm.onClick()">Click me</button>
    </div>
  `
})
class FooComponent {
  onClick() {
    alert('Button clicked')
  }
}
```

Now to later use that component in your HTML (or in HTML that belongs to another component - nested components are supported) we can simply do the following and it will display the component we just created.

```HTML
<body>
  <foo></foo>
</body>
```

#### Components and inputs and outputs

Components can take inputs and outputs, these are declared through the `inputs` parameter to the @Component.

Lets give an example where the foo button takes an input which determines the component title and sub title.

```TypeScript
@Component({
  selector: 'foo',
  inputs: ['@title','subTitle'],
  template: `
    <div>
      <h2>{{vm.title}}</h2>
      <button>Click me</button>
    </div>
  `
})
class FooComponent {
  title: string
  subTitle: string
}
```

```HTML
<body>
  <foo title="Hello world!" sub-title="'This has to be in quotes'"></foo>
</body>
```

Three parts are important here

1. there is the `inputs` parameter to the @Component, it lists all inputs by their name
2. there is the reference to the input property in the HTML template
3. there is the property on the class

Some notes; There are attribute inputs and expression inputs.

An expression input is evaluated, this is what you would mostly use in our sample the subTitle input has its contents evaluated. This means that you could also pass in an reference to a property which will setup a two way Angular binding as well.

An attribute input is prepended with an '@' sign and it means the contents of the attribute on the HTML element are interpreted as plain string content.

Finally note that we use camelCase here, which means that an input of subTitle becomes sub-title in the HTML.

#### Application routes

In order to reach the various pages in this one page application we use routes. These routes are used in combination with @Components.

In order to create a page that is accessible at the url `/#/some/path/some/where` we start by creating a folder named `app/src/components/routes/some` and in this folder we create a file named `some.ts`.

Now to make that page accessible at the example url mentioned we use the @RouteConfig, a route config is applied to a @Component annotation making that component into a special kind that fills the entire ng-viewport which is a place holder for route components and is declared in `app/index.html`.

Example of how to create a route and how to pass parameters in the url.

```TypeScript
@RouteConfig('/some/:param1/:param2')
@Component({
  selector: 'fooRoute',
  inputs: ['param1','param2'],
  template: `
    <div layout="column" flex layout-fill>
      <h1>Hello page</h1>
    </div>
  `
})
class FooRoute {
  param1:string
  param2:string
}
```

Now if we want to link to that route we would use this.

```HTML
<body>
  <a href="#/some/foo/bar">link</a>
</body>
```

## Setup

### Client failover

Client (heat-ui application) use Heat API to access to the Heat Ledger server. 
The server can fall or have network issues. In that case the client does not work.
The client failover feature helps to resolve this problem.
 
If you have multiple running servers you can specify those servers in the file `app/known-servers-config.json`.
The structure of each item in the JSON (in the file `app/known-servers-config.json`) 
is defined in the interface `ServerDescriptor` (in the `app/src/services/SettingsService.ts`) 
Client can switches between Heat Ledger servers specified in these file.

Client periodically polls the servers for their health value. 
If the health of other server significantly exceeds the health of the current server, 
the client will automatically switches to another server.
If health of servers are equal then used field `ServerDescriptor.priority` to define more 
preferable server (less value is more priority).