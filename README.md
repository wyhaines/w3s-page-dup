# w3s-page-dup

A bit of sample code showing how to use w3s to mirror a web page.

To use this, ensure that you have a w3s account by following the instructions in the [Quickstart](https://web3.storage/docs/quickstart/) guide.

Ensure that you have a relatively modern NodeJS installed (v18 or above). You will want to install some prerequisites:

```sh
npm install axios cheerio @web3-storage/w3up-client files-from-path
```

Then, you can run the script like so:

```sh
node w3s-page-dup EMAIL SPACE-ID URL
```

Where `EMAIL` is the email address you used to sign up for w3s, `SPACE-ID` is the space you want to use, and `URL` is the URL of the page you want to mirror.

The script will download the page, extract all the links, and then download all the linked resources. It will then upload all the files to w3s and print out the CID of the root directory, as well as a URL that you can use to access the mirrored page.

For example: https://bafybeifx2a5nxixjvkwveqqlswruehbhtkjmlgsg4jqgknumyplb7uypbq.ipfs.dweb.link/