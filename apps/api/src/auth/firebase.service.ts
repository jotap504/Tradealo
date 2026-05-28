import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App | null = null;

  onModuleInit() {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!encoded) {
      this.logger.warn('Firebase Admin SDK not configured — phone auth disabled');
      return;
    }

    try {
      const credential = JSON.parse(
        Buffer.from(encoded, 'base64').toString('utf8'),
      );

      if (admin.apps.length === 0) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert(credential),
        });
      } else {
        this.app = admin.apps[0]!;
      }
    } catch {
      this.logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_B64');
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.app) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return admin.auth(this.app).verifyIdToken(idToken);
  }
}