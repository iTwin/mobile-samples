/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import PromiseKit
import UIKit
import ITwinMobile

/// Class for interacting with the image cache.
class ImageCache {
    /// Get all the images for a given iModel
    /// - Parameter params: Requires an `iModelId` property to specify which iModel to get images for.
    /// - Returns: A Promise that resolves to an array of image cache URLs for all the images in the cache for the given iModel
    static func handleGetImages(params: [String: Any]) -> Promise<[String]> {
        guard let iModelId = params["iModelId"] as? String, let dirURL = baseURL?.appendingPathComponent(iModelId) else {
            return Promise.value([])
        }
        let fm = FileManager.default
        var results: [String] = []
        // The prefix is an image cache URL pointing to the directory for this iModel.
        let prefix = "\(ImageCacheSchemeHandler.urlScheme)://\(iModelId)/"
        if let allURLs = try? fm.contentsOfDirectory(at: dirURL, includingPropertiesForKeys: nil) {
            for url in allURLs {
                let urlString = NSString(string: url.absoluteString)
                results.append("\(prefix)\(urlString.lastPathComponent)")
            }
        }
        return Promise.value(results)
    }
    
    /// Deletes all the images in the cache for the given iModel.
    /// - Parameter params: Requires an `iModelId` property to specify which iModel to delete images for.
    /// - Returns: A Promise that resolves to Void.
    static func handleDeleteAllImages(params: [String: Any]) {
        guard let iModelId = params["iModelId"] as? String, let dirURL = baseURL?.appendingPathComponent(iModelId) else {
            return
        }
        // Delete all the files in the image cache directory for the given iModel.
        let fm = FileManager.default
        if let allURLs = try? fm.contentsOfDirectory(at: dirURL, includingPropertiesForKeys: nil) {
            for url in allURLs {
                do {
                    try fm.removeItem(at: url)
                } catch {}
            }
        }
    }
    
    private static func deleteImage(urlString: String) {
        if let fileUrl = getFileUrl(URL(string: urlString)) {
            do {
                try FileManager.default.removeItem(at: fileUrl)
            } catch {}
        }
    }
    
    /// Deletes a specific image cache image.
    /// - Parameter params: Requires a `urls` property containing a string or array of strings with the image cache URL's to delete.
    /// - Returns: A Promise that resolves to Void.
    static func handleDeleteImages(params: [String: Any]) {
        if let urls = params["urls"] as? [String] {
            for url in urls {
                deleteImage(urlString: url)
            }
        } else if let urlString = params["urls"] as? String {
            deleteImage(urlString: urlString)
        }
    }
    
    /// Convert an image cache URL into a file URL.
    /// - Parameter cacheUrl: The image cache URL to convert.
    /// - Returns: Upon success, a file URL that corresponds to the file referenced by the image cache URL, otherwise nil.
    static func getFileUrl(_ cacheUrl: URL?) -> URL? {
        guard let cacheUrl = cacheUrl, let scheme = cacheUrl.scheme else {
            return nil
        }
        let urlString = cacheUrl.absoluteString
        // I hate to say it, but Swift ROYALLY messed up substrings. This is totally inexcusable
        // garbage syntax in place of the now-deprecated clean and obvious substring(from:).
        let index = urlString.index(urlString.startIndex, offsetBy: scheme.count + 3)
        let cachePath = String(urlString[index...])
        if let baseURLString = ImageCache.baseURL?.absoluteString {
            return URL(string: "\(baseURLString)\(cachePath)")
        }
        return nil
    }

    /// The baseURL to use to store images.
    static var baseURL: URL? {
        get {
            guard let cachesDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).last else {
                return nil
            }
            return cachesDir.appendingPathComponent("images")
        }
    }
    
    /// Write a `UIImage` to the the given file URL.
    /// - Parameters:
    ///   - image: The `UIImage` to write to cache.
    ///   - url: The file URL to which to write the image.
    ///   - metadata: Metadata to include in the image.
    static func writeImage(_ image: UIImage, to url: URL, with metadata: NSDictionary?) throws {
        // Generate JPEG data for the UIImage.
        guard let imageData = image.jpegData(compressionQuality: 0.85) else { throw ITMError(json: ["message": "Error converting UIImage to JPEG."]) }
        guard let source = CGImageSourceCreateWithData(imageData as CFData, nil) else { throw ITMError(json: ["message": "Error creating image source from JPEG data."]) }
        guard let type = CGImageSourceGetType(source) else { throw ITMError(json: ["message": "Error getting type from image source."]) }

        guard let destination: CGImageDestination = CGImageDestinationCreateWithURL(url as CFURL, type, 1, nil) else { throw ITMError(json: ["message": "Error creating image destination."]) }
        CGImageDestinationAddImageFromSource(destination, source, 0, metadata as CFDictionary?)
        if !CGImageDestinationFinalize(destination) {
            throw ITMError(json: ["message": "Error writing JPEG data."])
        }
    }
}
