import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from "@azure/storage-blob"
import { env } from "@workspace/config"
import type { BlobStorageAdapter } from "./blob-storage.adapter.js"

const DEFAULT_AZURITE_CONNECTION_STRING =
  "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
const AZURITE_ACCOUNT_NAME = "devstoreaccount1"
const AZURITE_ACCOUNT_KEY =
  "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="

export function createBlobStorageAdapter(): BlobStorageAdapter {
  const connectionString =
    env.AZURE_STORAGE_CONNECTION_STRING ?? DEFAULT_AZURITE_CONNECTION_STRING
  const credential = sharedKeyCredentialFromEnv(connectionString)
  const serviceClient =
    connectionString === DEFAULT_AZURITE_CONNECTION_STRING
      ? BlobServiceClient.fromConnectionString(connectionString)
      : BlobServiceClient.fromConnectionString(connectionString)

  return new AzureBlobStorageAdapter(
    serviceClient,
    credential,
    isAzuriteConnectionString(connectionString)
  )
}

class AzureBlobStorageAdapter implements BlobStorageAdapter {
  private readonly serviceClient: BlobServiceClient
  private readonly credential: StorageSharedKeyCredential
  private readonly configureLocalCors: boolean
  private corsConfigured = false

  constructor(
    serviceClient: BlobServiceClient,
    credential: StorageSharedKeyCredential,
    configureLocalCors: boolean
  ) {
    this.serviceClient = serviceClient
    this.credential = credential
    this.configureLocalCors = configureLocalCors
  }

  async generateSignedUploadUrl(
    container: string,
    blobKey: string,
    lifetimeSeconds: number
  ): Promise<string> {
    await this.ensureContainer(container)
    return this.signedBlobUrl(container, blobKey, lifetimeSeconds, "cw")
  }

  generateSignedReadUrl(
    container: string,
    blobKey: string,
    lifetimeSeconds: number
  ): Promise<string> {
    return Promise.resolve(
      this.signedBlobUrl(container, blobKey, lifetimeSeconds, "r")
    )
  }

  async verifyBlob(
    container: string,
    blobKey: string
  ): Promise<{ exists: boolean; size?: number; mimeType?: string }> {
    const blobClient = this.serviceClient
      .getContainerClient(container)
      .getBlobClient(blobKey)

    try {
      const properties = await blobClient.getProperties()
      return {
        exists: true,
        size: properties.contentLength,
        mimeType: properties.contentType,
      }
    } catch (error) {
      if (isNotFound(error)) return { exists: false }
      throw error
    }
  }

  async deleteBlob(container: string, blobKey: string): Promise<void> {
    await this.serviceClient
      .getContainerClient(container)
      .deleteBlob(blobKey, { deleteSnapshots: "include" })
  }

  private async ensureContainer(container: string): Promise<void> {
    if (this.configureLocalCors && !this.corsConfigured) {
      await this.configureAzuriteCors()
      this.corsConfigured = true
    }
    await this.serviceClient.getContainerClient(container).createIfNotExists()
  }

  private async configureAzuriteCors(): Promise<void> {
    await this.serviceClient.setProperties({
      cors: [
        {
          allowedOrigins: localCorsOrigins(),
          allowedMethods: "GET,PUT,OPTIONS",
          allowedHeaders: "content-type,x-ms-*",
          exposedHeaders: "etag,x-ms-*",
          maxAgeInSeconds: 3600,
        },
      ],
    })
  }

  private signedBlobUrl(
    container: string,
    blobKey: string,
    lifetimeSeconds: number,
    permissions: string
  ): string {
    const startsOn = new Date(Date.now() - 60_000)
    const expiresOn = new Date(Date.now() + lifetimeSeconds * 1000)
    const sas = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName: blobKey,
        permissions: BlobSASPermissions.parse(permissions),
        startsOn,
        expiresOn,
        protocol: SASProtocol.HttpsAndHttp,
      },
      this.credential
    ).toString()

    const blobClient = this.serviceClient
      .getContainerClient(container)
      .getBlobClient(blobKey)
    return `${blobClient.url}?${sas}`
  }
}

function sharedKeyCredentialFromEnv(
  connectionString: string
): StorageSharedKeyCredential {
  if (isAzuriteConnectionString(connectionString)) {
    return new StorageSharedKeyCredential(
      env.AZURE_STORAGE_ACCOUNT_NAME ?? AZURITE_ACCOUNT_NAME,
      env.AZURE_STORAGE_ACCOUNT_KEY ?? AZURITE_ACCOUNT_KEY
    )
  }

  const parsed = Object.fromEntries(
    connectionString
      .split(";")
      .map((part) => part.split("="))
      .filter((part): part is [string, string] => part.length === 2)
  )
  const accountName = env.AZURE_STORAGE_ACCOUNT_NAME ?? parsed.AccountName
  const accountKey = env.AZURE_STORAGE_ACCOUNT_KEY ?? parsed.AccountKey

  if (!accountName || !accountKey) {
    throw new Error(
      "Azure Blob Storage requires AZURE_STORAGE_CONNECTION_STRING with AccountName/AccountKey or explicit AZURE_STORAGE_ACCOUNT_NAME/AZURE_STORAGE_ACCOUNT_KEY."
    )
  }

  return new StorageSharedKeyCredential(accountName, accountKey)
}

function localCorsOrigins(): string {
  const origins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"])
  addOrigin(origins, env.WEB_APP_URL)
  return [...origins].join(",")
}

function addOrigin(origins: Set<string>, value: string | undefined): void {
  if (!value) return

  try {
    origins.add(new URL(value).origin)
  } catch {
    return
  }
}

function isAzuriteConnectionString(connectionString: string): boolean {
  return (
    connectionString.includes("UseDevelopmentStorage=true") ||
    connectionString.includes("127.0.0.1:10000") ||
    connectionString.includes("devstoreaccount1")
  )
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode?: number }).statusCode === 404
  )
}
