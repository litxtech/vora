import UserNotifications
import Intents

/// Gelen arama push'larını iOS Communication Notification (WhatsApp tarzı) olarak gösterir.
/// CallKit kullanılmaz — yalnızca INStartCallIntent + Communication Notifications.
class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttemptContent: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    guard let mutable = request.content.mutableCopy() as? UNMutableNotificationContent else {
      contentHandler(request.content)
      return
    }
    self.bestAttemptContent = mutable

    let payload = Self.extractPayload(from: mutable.userInfo)
    let eventType =
      (payload["eventType"] as? String) ??
      (payload["event_type"] as? String) ??
      ""

    guard eventType == "call_incoming" || eventType == "call_video" else {
      contentHandler(mutable)
      return
    }

    let callerName =
      (payload["sender_name"] as? String) ??
      (payload["senderName"] as? String) ??
      (mutable.subtitle.isEmpty ? mutable.title : mutable.subtitle)

    let callerId =
      (payload["actorId"] as? String) ??
      (payload["actor_id"] as? String) ??
      UUID().uuidString

    let imageUrlString =
      (payload["image_url"] as? String) ??
      (payload["imageUrl"] as? String) ??
      (payload["actor_avatar_url"] as? String)

    let isVideo = eventType == "call_video"

    Self.buildCommunicationContent(
      base: mutable,
      callerName: callerName,
      callerId: callerId,
      imageUrlString: imageUrlString,
      isVideo: isVideo,
      contentHandler: contentHandler
    )
  }

  override func serviceExtensionTimeWillExpire() {
    if let contentHandler, let bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }

  private static func extractPayload(from userInfo: [AnyHashable: Any]) -> [String: Any] {
    if let body = userInfo["body"] as? [String: Any] {
      return body
    }

    var result: [String: Any] = [:]
    for (key, value) in userInfo {
      guard let key = key as? String, key != "aps" else { continue }
      result[key] = value
    }
    return result
  }

  private static func buildCommunicationContent(
    base: UNMutableNotificationContent,
    callerName: String,
    callerId: String,
    imageUrlString: String?,
    isVideo: Bool,
    contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    var avatarImage: INImage?
    if let imageUrlString, let url = URL(string: imageUrlString) {
      avatarImage = downloadImage(from: url)
    }

    var nameComponents = PersonNameComponents()
    nameComponents.nickname = callerName

    let handle = INPersonHandle(value: callerId, type: .unknown)
    let caller = INPerson(
      personHandle: handle,
      nameComponents: nameComponents,
      displayName: callerName,
      image: avatarImage,
      contactIdentifier: nil,
      customIdentifier: callerId
    )

    let capability: INCallCapability = isVideo ? .videoCall : .audioCall
    let intent = INStartCallIntent(
      callRecordFilter: nil,
      callRecordToCallBack: nil,
      audioRoute: .unknownAudioRoute,
      destinationType: .normal,
      contacts: [caller],
      callCapability: capability
    )

    let interaction = INInteraction(intent: intent, response: nil)
    interaction.direction = .incoming

    interaction.donate { _ in
      do {
        let updated = try base.updating(from: intent)
        contentHandler(updated)
      } catch {
        contentHandler(base)
      }
    }
  }

  private static func downloadImage(from url: URL) -> INImage? {
    let semaphore = DispatchSemaphore(value: 0)
    var imageData: Data?

    URLSession.shared.dataTask(with: url) { data, _, _ in
      imageData = data
      semaphore.signal()
    }.resume()

    _ = semaphore.wait(timeout: .now() + 4)
    guard let imageData else { return nil }
    return INImage(imageData: imageData)
  }
}
