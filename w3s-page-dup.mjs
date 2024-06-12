import axios from 'axios'
import cheerio from 'cheerio'
import path from 'path'
import { promises as fs } from 'fs'
import { create } from '@web3-storage/w3up-client'
import { filesFromPaths } from 'files-from-path'

const assetBase = path.join(process.cwd(), 'assets')

/**
 * Scrapes a webpage and downloads all its assets (CSS, JS, images).
 * @param {string} url - The URL of the webpage to scrape.
 * @returns {Promise<string[]>} - A promise that resolves to an array of file paths.
 */
export async function scrapePage(url) {
  try {
    const { data } = await axios.get(url)
    const $ = cheerio.load(data)

    const assets = []
    $('link[rel="stylesheet"], script[src], img[src]').each((i, element) => {
      const assetUrl = $(element).attr('href') || $(element).attr('src')
      if (assetUrl) {
        const absoluteUrl = new URL(assetUrl, url).href
        assets.push({ element, assetUrl: absoluteUrl })
      }
    })

    const assetPaths = await downloadAssets(assets, $)
    const modifiedHtmlPath = path.join(assetBase, 'index.html')
    await fs.writeFile(modifiedHtmlPath, $.html())

    return [modifiedHtmlPath, ...assetPaths]
  } catch (error) {
    console.error('Error scraping the page:', error)
    return []
  }
}

/**
 * Downloads assets and saves them locally.
 * @param {Array} assets - An array of asset objects to download.
 * @param {Object} $ - The Cheerio instance.
 * @returns {Promise<string[]>} - A promise that resolves to an array of asset file paths.
 */
export async function downloadAssets(assets, $) {
  const assetPaths = []
  for (const { element, assetUrl } of assets) {
    try {
      console.log(`Fetching: ${assetUrl}`)
      const response = await axios.get(assetUrl, { responseType: 'arraybuffer' })
      const assetPath = path.join(assetBase, path.basename(assetUrl))
      await ensureDirectoryExists(path.dirname(assetPath))
      await fs.writeFile(assetPath, response.data)
      assetPaths.push(assetPath)

      if (element.tagName === 'link') {
        $(element).attr('href', `assets/${path.basename(assetUrl)}`)
      } else {
        $(element).attr('src', `assets/${path.basename(assetUrl)}`)
      }
    } catch (error) {
      console.error(`Failed to download asset: ${assetUrl}`, error)
    }
  }
  return assetPaths
}

/**
 * Ensures that a directory exists, creating it if necessary.
 * @param {string} dir - The directory path.
 */
export async function ensureDirectoryExists(dir) {
  await fs.mkdir(dir, { recursive: true })
}

/**
 * Clear the assetBase directory of old files.
 */
export async function clearAssets() {
  try {
    await fs.rmdir(assetBase, { recursive: true })
    await fs.mkdir(assetBase)
  } catch (error) {
    console.error('Error clearing assets:', error)
  }
}

/**
 * Uploads files to Web3 Storage.
 * @param {string[]} files - An array of file paths to upload.
 * @param {string} email - The email address for Web3 Storage account.
 * @param {string} key - The key for the Web3 Storage space.
 * @returns {Promise<string>} - A promise that resolves to the Web3 Storage URL.
 */
export async function uploadToWeb3Storage(files, email, key) {
  try {
    const client = await create()
    await client.login(email)
    await client.setCurrentSpace(`did:key:${key}`)
    const filesToUpload = await filesFromPaths(files)
    const directoryCid = await client.uploadDirectory(filesToUpload)
    console.log('Uploaded directory CID:', directoryCid)
    return `https://${directoryCid}.ipfs.dweb.link`
  } catch (error) {
    console.error('Error uploading to web3.storage:', error)
  }
}

/**
 * If the script is run directly, scrape a page and upload it to Web3 Storage.
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const email = process.argv[2]
    const space = process.argv[3]
    const url = process.argv[4]

    if (!email) {
      console.error("Please provide your email address.\nUsage: node script.js my-email@provider.com <space> <url>")
      process.exit(1)
    }

    if (!space) {
      console.error("Please provide a space key for Web3 Storage.\nUsage: node script.js <email> <space> <url>")
      process.exit(1)
    }

    if (!url) {
      console.error("Please provide the URL of a page to duplicate.\nUsage: node script.js <email> <space> <url>")
      process.exit(1)
    }

    const files = await scrapePage(url)
    if (files.length > 0) {
      const web3StorageUrl = await uploadToWeb3Storage(files, email, space)
      if (web3StorageUrl) {
        console.log('Access the copied page at:', web3StorageUrl)
      }
    }
  })()
}