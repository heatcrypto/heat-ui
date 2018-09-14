# Get started with HEAT Wallet 2.7.0

August/september 2018 | Provided to you by the developers of Heat Ledger Ltd - creators of the HEAT cryptocurrency.

We are proud to present you with version 2.7.0 of our Desktop HEAT Wallet.

Your fully functional wallet for HEAT, Bitcoin and Ethereum (with partial ERC20 support).

  - with integrated HEAT Asset Exchange.
  - with integrated HEAT block explorer
  - with embeded HEAT p2p server

## Tldr;

With HEAT wallet you can create a HEAT master key giving you access to your free HEAT account on the HEAT blockchain network.

From your single HEAT master key you can create any number of Bitcoin or Ethereum addresses.

Use HEAT wallet to send, receive and inspect your HEAT, Bitcoin, Ethereum and ERC20 tokens (partial support).

HEAT wallet is a `real` wallet for HEAT, Bitcoin and Ethereum. Your funds are kept on your machine only your keys are with you and never leave your machine.

## Installation

Our wallet desktop software is available in two flavors;

  1. HEAT Wallet - The full version (**with** HEAT cryptocurrency server, you can operate your own server node, be part of the p2p network and mine blocks)
  2. HEAT Client - The light version (fully functional except it does not come with the server)

Both HEAT Wallet as well as HEAT Client are available for all major operating systems.

  1. Windows 7 to 10 (64bit machines only)
  2. Apple Mac OSX - minimum version is MacOS 10.9
  3. Linux (64bit machines only)
      1. Ubuntu 12.04 and newer
      2. Fedora 21 (should work)
      3. Debian 8 (should work)

On Windows we have the easy installer, simply download and open the installer.

![Windows installer at work](https://i.imgur.com/gnxyESf.gif)

Mac OSX users download a zip file which you can open and find inside the HEAT App, simply drag the application to your task bar or desktop. Double click the HEAT icon to start the application.

Linux users download the zip file and extract to a location of your choice. Run the executable in the installation directory by double clicking or execute on the command line.

### Downloads

HEAT Wallet (full version - includes HEAT p2p server)

  - Windows [Heatwallet_Setup_2.7.0.exe](https://github.com/Heat-Ledger-Ltd/heatwallet/releases/download/v2.6.3/Heatwallet_Setup_2.7.0.exe)
  - OSX [Heatwallet_MacOS_2.7.0.zip](https://github.com/Heat-Ledger-Ltd/heatwallet/releases/download/v2.6.3/Heatwallet_MacOS_2.7.0.zip)
  - Linux [Heatwallet_Linux_2.7.0.zip](https://github.com/Heat-Ledger-Ltd/heatwallet/releases/download/v2.6.3/Heatwallet_Linux_2.7.0.zip)

HEAT Client (light version)

  - Windows [Heatclient_Setup_2.7.0.exe](https://github.com/Heat-Ledger-Ltd/heat-ui/releases/download/v2.6.3/Heatclient_Setup_2.7.0.exe)
  - OSX [Heatclient_MacOS_2.7.0.zip](https://github.com/Heat-Ledger-Ltd/heat-ui/releases/download/v2.6.3/Heatclient_MacOS_2.7.0.zip)
  - Linux [Heatclient_Linux_2.7.0.zip](https://github.com/Heat-Ledger-Ltd/heat-ui/releases/download/v2.6.3/Heatclient_Linux_2.7.0.zip)

### Application Settings

You can create HEAT, Ethereum and Bitcoin identities with Private Keys with this wallet. Your Private Keys are kept in the application database, stored on your machine in your user profile. Which you should backup! (more on that later)

With the full version all downloaded blockchain data is stored in your user profile. The location of your user profile depends on your operating system.

To acces your installation or user profile you can do so from the in app server page and click **INSTALL DIR** or **USER DIR**.

![Install and Profile Dir](https://i.imgur.com/sa0Ys0p.png)

## Account Setup

After installation when first presented with the HEAT wallet you are offered to create a HEAT account, you are asked to choose an alias which will be assigned to your new account. Aliases start with a name of your choosing and end with `@heatwallet.com`.

```
Note! Email aliases currently serve as account identifiers. Future uses include email/messaging and other functionality.
```

After choosing an available name you select wheter you want your account to be public or private. Public names support things like autocomplete and will show the name instead of the account id in the wallet. Private names will display as account number only, only you will be able to see your private name.

```
Note! Work is underway where others that know your private name can send funds to you using that name instead of your account id.
```

Public names show up everywhere in the wallet where a `recipient` can be entered.

![Send money autocomplete](https://i.imgur.com/JQqcO18.gif)

When sending HEAT to others.

![Lease balance](https://i.imgur.com/bilqMRs.gif)

When leasing your balance to a pool operator.

## Create Your Account

You need to provide a name for your account, select either public or private and enter a password which we use to encrypt your keys when we store them on your computer.

![Create HEAT account](https://i.imgur.com/B4dmUSz.gif)

You could be asked to solve a so called `Captcha` which is our way to ensure you are not a robot (to prevent abuse).

![Capctha](https://i.imgur.com/6xCZHbh.gif)

Within seconds after creating your account you will see that your address exists and you'll receive your first message welcoming you to HEAT.

![Account created](https://i.imgur.com/cgjaGNq.gif)

## Backup Your Keys!

It is very important that you safely backup your private keys. To backup your keys consider these options.

  1. Write down your key(s) (HEAT keys are human readable 12 word phrases, perfect for writing down)
  2. Store key in paper wallet and print to file ([look here for the HEAT paper wallet project](https://github.com/Heat-Ledger-Ltd/heat-paperwallet)) look for "Use existing key" option.
  3. Download your wallet file containing all your keys in HEAT wallet file format (`heat.wallet`)

To view your currently used private key or download the wallet file we visit the main menu.

![The main menu](https://i.imgur.com/mNHjny1.png?1)

The HEAT paper wallet is a great way for you to store your keys, you can scan the QR codes to easily copy the private key or address to your HEAT seeds or Bitcoin or Ethereum private keys. Click the "Use existing key instead" button after which you can enter your private key. Print the page (CTRL+P or right click menu -> Print) for safe keeping.

![Paper wallet](https://raw.githubusercontent.com/Heat-Ledger-Ltd/heat-paperwallet/master/app/paperwallet-sample.png)

## <a name="bitcoin"></a>Bitcoin

With HEAT wallet you can store, transfer and explore your Bitcoins.

Bitcoin is supported in two ways:

  1. Through bitcoin private keys directly
  2. Through BIP44 HEAT seeds

```
Note! HEAT private keys are also BIP44 compatible seeds, see https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki. What this means is that the same seed that gives you access to your HEAT account (the 12 words phrase) also gives you access to any number of derived Bitcoin addresses.
```

Bitcoin private keys can be added to the wallet by clicking the Wallet icon in the toolbar and clicking `Import Seed/Private Key`.

```
Note! Currently only existing bitcoin addresses can be added by their private key. To create a new bitcoin address create a HEAT account and add bitcoin addresses to that.
```

![Bitcoin private key](https://i.imgur.com/IyCsGVt.gif)

To create new bitcoin addresses you need to do so under a BIP44 compatible HEAT master seed. If you havent done so create a HEAT master key first. Then head over to the wallet page to create any number of new unique bitcoin addresses based of your HEAT master key.

![Derived Bitcoin address](https://i.imgur.com/dqIVYLr.gif)

After you use the new address at least once you will be able to add more bitcoin addresses to your HEAT mastrer account.

To transfer Bitcoin click the `Send Bitcoin` button in the toolbar at the top of the application. Enter a recipient address and an amount to transfer Bitcoin.

Before sending Bitcoin you need to `select` the Bitcoin address you will be sending from. Go to the wallet page and select the bitcoin address from the list.

![Select bitcoin address](https://i.imgur.com/kMhv9e0.gif)

Now you can send bitcoins.

![Send Bitcoins](https://i.imgur.com/TKfY5UX.gif)

## Ethereum

With HEAT wallet you can store, transfer and explorer your Ethereum and ERC20 token balances.

Ethereum is supported in these ways:

  1. Through ethereum private keys directly
  2. Through BIP44 HEAT seeds
  3. Through support for the binary Ethereum ABI protocol we can inspect and visualize raw Ethereum transactions (ERC20 details)

```
Note! HEAT private keys are also BIP44 compatible seeds, see https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki. What this means is that the same seed that gives you access to your HEAT account (the 12 words phrase) also gives you access to any number of derived Bitcoin addresses.
```

Ethereum private keys can be added to the wallet in the exact same way as we can add Bitcoin private keys. Please see [the section on bitcoin](#bitcoin) for how to do that.

```
Note! Currently only existing ethereum addresses can be added by their private key. To create a new bitcoin address create a HEAT account and add bitcoin addresses to that.
```

The wallet page will display all Ethereum addresses based of your master HEAT key plus it will display your ERC20 token balances for each Ethereum address.

![ERC20 balances](https://i.imgur.com/n86XQaE.gif)