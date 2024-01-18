/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import UIKit
import ITwinMobile

/// Class for interacting with the image cache.
class ImageCache {
    /// Get all the images for a given iModel.
    ///
    /// This is a handler for the `'getImages'` query.
    /// - Parameter params: Requires an `iModelId` property to specify which iModel to get images for.
    /// - Returns: An array of image cache URLs for all the images in the cache for the given iModel
    static func handleGetImages(params: [String: Any]) -> [String] {
        guard let iModelId = params["iModelId"] as? String, let dirURL = baseURL?.appendingPathComponent(iModelId) else {
            return []
        }
        let fm = FileManager.default
        var results: [String] = []
        // The prefix is an image cache URL pointing to the directory for this iModel.
        let prefix = "\(ImageCacheSchemeHandler.urlScheme)://\(iModelId)/"
        if let allURLs = try? fm.contentsOfDirectory(at: dirURL, includingPropertiesForKeys: [.pathKey]) {
            for url in allURLs {
                results.append("\(prefix)\(url.lastPathComponent)")
            }
        }
        return results
    }
    
    /// Deletes all the images in the cache for the given iModel.
    ///
    /// This is a handler for the `'deleteAllImages'` query.
    /// - Parameter params: Requires an `iModelId` property to specify which iModel to delete images for.
    static func handleDeleteAllImages(params: [String: Any]) {
        guard let iModelId = params["iModelId"] as? String, let dirURL = baseURL?.appendingPathComponent(iModelId) else {
            return
        }
        // Delete the image cache directory for the given iModel.
        let fm = FileManager.default
        try? fm.removeItem(at: dirURL)
    }
    
    /// Create a `URL` from the given string, encoding using percent encoding where needed.
    /// - Parameter urlString: The string to convert to a `URL`.
    /// - Returns: A `URL` for the given string, or `nil` if there is an error.
    static func URL(string urlString: String) -> URL? {
        // Prior to iOS 17, URL(string:) failed for strings with invalid characters (including
        // spaces). URLComponents(string:) automatically percent-encodes such characters.
        guard let components = URLComponents(string: urlString), let url = components.url else {
            return nil
        }
        return url
    }

    /// Delete the image referenced by the given image cache URL.
    /// - Parameter urlString: URL using camera sample's custom URL scheme to reference a cached image to be deleted.
    private static func deleteImage(urlString: String) {
        if let fileURL = getFileURL(URL(string: urlString)) {
            do {
                try FileManager.default.removeItem(at: fileURL)
            } catch {}
        }
    }
    
    /// Deletes specific image cache images.
    ///
    /// This is a handler for the `'deleteImages'` query.
    /// - Parameter params: Requires a `urls` property containing a string or array of strings with the image cache URLs to delete.
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
    /// - Parameter cacheURL: The image cache URL to convert.
    /// - Returns: Upon success, a file URL that corresponds to the file referenced by the image cache URL, otherwise nil.
    static func getFileURL(_ cacheURL: URL?) -> URL? {
        guard let cacheURL = cacheURL, let scheme = cacheURL.scheme else {
            return nil
        }
        if let baseURLString = ImageCache.baseURL?.absoluteString {
            // Note: The "+ 3" below is for the "://" after the scheme.
            let cachePath = String(cacheURL.absoluteString.dropFirst(scheme.count + 3))
            return URL(string: "\(baseURLString)\(cachePath)")
        }
        return nil
    }

    /// The baseURL to use to store images.
    static var baseURL: URL? {
        get {
            guard let cachesDir = try? FileManager.default.url(for: .cachesDirectory,
                                                               in: .userDomainMask,
                                                               appropriateFor: nil,
                                                               create: true) else {
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
        guard let imageData = image.jpegData(compressionQuality: 0.85) else {
            throw ITMStringError(errorDescription: "Error converting UIImage to JPEG!")
        }
        guard let metadata = metadata else {
            // If there's no metadata, just write the JPEG image to a file.
            try imageData.write(to: url)
            return
        }
        guard let source = CGImageSourceCreateWithData(imageData as CFData, nil) else {
            throw ITMStringError(errorDescription: "Error creating image source from JPEG data.")
        }
        guard let type = CGImageSourceGetType(source) else {
            throw ITMStringError(errorDescription: "Error getting type from image source.")
        }
        guard let destination = CGImageDestinationCreateWithURL(url as CFURL, type, 1, nil) else {
            throw ITMStringError(errorDescription: "Error creating image destination.")
        }
        CGImageDestinationAddImageFromSource(destination, source, 0, metadata as CFDictionary)
        if !CGImageDestinationFinalize(destination) {
            throw ITMStringError(errorDescription: "Error writing JPEG data.")
        }
    }
}
