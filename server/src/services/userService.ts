import { db } from '../firebase';

interface UserData {
    telegramId: number;
    phoneNumber: string;
    firstName: string;
    lastName?: string;
    username?: string;
    registeredAt: Date;
    balance: number;
    referralCode: string;
    referredBy?: number; // telegramId of referrer
}

class UserService {
    // ... (keep private properties)
    private users: Map<number, UserData> = new Map();
    private useFirebase: boolean = false;

    constructor() {
        // ... (keep constructor)
        // Check if Firebase is available
        try {
            if (db) {
                this.useFirebase = true;
                console.log('✅ UserService: Using Firebase for storage');
            } else {
                console.log('⚠️  UserService: Using in-memory storage (Firebase not configured or db is null)');
            }
        } catch (error) {
            console.log('⚠️  UserService: Using in-memory storage (Firebase not configured)');
        }
    }

    private generateReferralCode(firstName: string): string {
        const prefix = firstName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        const random = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${random}`;
    }

    async registerUser(data: {
        telegramId: number;
        phoneNumber: string;
        firstName: string;
        lastName?: string;
        username?: string;
        referralCode?: string; // Code they used to sign up
    }): Promise<UserData> {
        // Check if already registered
        if (await this.isRegistered(data.telegramId)) {
            throw new Error('User already registered');
        }

        // Generate *their* unique referral code
        let newReferralCode = this.generateReferralCode(data.firstName);
        // Ensure uniqueness (simple check)
        // In prod, would query DB. For now, assume collision unlikely enough for 4 digits

        const newUser: UserData = {
            telegramId: data.telegramId,
            phoneNumber: data.phoneNumber,
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username,
            registeredAt: new Date(),
            balance: 100, // Welcome bonus
            referralCode: newReferralCode
        };

        // Process Referral *used* by this user
        if (data.referralCode) {
            const referrer = await this.findUserByReferralCode(data.referralCode);
            if (referrer && referrer.telegramId !== newUser.telegramId) {
                console.log(`🎁 Referral valid! ${referrer.firstName} referred ${newUser.firstName}`);
                newUser.referredBy = referrer.telegramId;

                // Award Bonus to Referrer
                await this.updateBalance(referrer.telegramId, 50);
                console.log(`💰 Awarded 50 Birr to ${referrer.firstName}`);
            }
        }

        // Store in memory
        this.users.set(data.telegramId, newUser);

        // Store in Firebase
        if (this.useFirebase && db) {
            try {
                const firebaseData: any = {
                    ...newUser,
                    registeredAt: newUser.registeredAt.toISOString()
                };
                // Cleanup undefined
                Object.keys(firebaseData).forEach(key => firebaseData[key] === undefined && delete firebaseData[key]);

                await db.collection('users').doc(data.telegramId.toString()).set(firebaseData);
                console.log(`✅ User registered in Firebase with Referral Code: ${newReferralCode}`);
            } catch (error) {
                console.error('Firebase registration error:', error);
            }
        }

        return newUser;
    }

    async findUserByReferralCode(code: string): Promise<UserData | null> {
        // Memory search
        for (const user of this.users.values()) {
            if (user.referralCode === code) return user;
        }

        // Firebase search
        if (this.useFirebase && db) {
            try {
                const snapshot = await db.collection('users').where('referralCode', '==', code).limit(1).get();
                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    const user = {
                        ...data,
                        registeredAt: new Date(data.registeredAt)
                    } as UserData;
                    // Cache
                    this.users.set(user.telegramId, user);
                    return user;
                }
            } catch (error) {
                console.error('Firebase find by referral error:', error);
            }
        }
        return null;
    }

    // ... (rest of methods: getUser, isRegistered, updateBalance, getAllUsers)

    async getUser(telegramId: number): Promise<UserData | null> {
        // Check memory first
        let user = this.users.get(telegramId);

        // If not in memory and Firebase is available, check Firebase
        if (!user && this.useFirebase && db) {
            try {
                const doc = await db.collection('users').doc(telegramId.toString()).get();
                if (doc.exists) {
                    const data = doc.data();
                    user = {
                        ...data,
                        registeredAt: new Date(data!.registeredAt)
                    } as UserData;
                }
            } catch (error) {
                console.error('Firebase get user error:', error);
            }
        }

        // Lazy Migration: If user exists but has no referral code, generate one
        if (user && !user.referralCode) {
            console.log(`⚠️ User ${user.firstName} missing referral code. Generating...`);
            user.referralCode = this.generateReferralCode(user.firstName);

            // Update memory
            this.users.set(telegramId, user);

            // Update Firebase
            if (this.useFirebase && db) {
                db.collection('users').doc(telegramId.toString()).update({
                    referralCode: user.referralCode
                }).catch(e => console.error('Error saving lazy migration referral code:', e));
            }
        } else if (user) {
            // Cache in memory if found (and not just updated)
            this.users.set(telegramId, user);
        }

        return user || null;
    }

    async isRegistered(telegramId: number): Promise<boolean> {
        // ... (keep existing implementation)
        // Check memory first
        if (this.users.has(telegramId)) {
            return true;
        }

        // Check Firebase if available
        if (this.useFirebase && db) {
            try {
                const doc = await db.collection('users').doc(telegramId.toString()).get();
                if (doc.exists) {
                    // Cache in memory
                    const data = doc.data();
                    const user = {
                        ...data,
                        registeredAt: new Date(data!.registeredAt)
                    } as UserData;
                    this.users.set(telegramId, user);
                    return true;
                }
            } catch (error) {
                console.error('Firebase check registration error:', error);
            }
        }

        return false;
    }

    async updateBalance(telegramId: number, amount: number): Promise<number> {
        // ... (keep existing implementation)
        const user = await this.getUser(telegramId);
        if (!user) throw new Error('User not found');

        user.balance += amount;
        this.users.set(telegramId, user);

        // Update in Firebase if available
        if (this.useFirebase && db) {
            try {
                await db.collection('users').doc(telegramId.toString()).update({
                    balance: user.balance
                });
            } catch (error) {
                console.error('Firebase update balance error:', error);
            }
        }

        return user.balance;
    }

    async getReferralStats(telegramId: number): Promise<{ count: number; earnings: number }> {
        let count = 0;

        // Memory count
        for (const user of this.users.values()) {
            if (user.referredBy === telegramId) count++;
        }

        // Firebase count (if counting large datasets, this query is better)
        if (this.useFirebase && db) {
            try {
                // If not everything is in memory, query DB
                // For optimal perf, we'd cache this count on the user document, but query is fine for now
                const snapshot = await db.collection('users').where('referredBy', '==', telegramId).get();
                count = snapshot.size;
            } catch (error) {
                console.error('Error fetching referral stats:', error);
            }
        }

        return {
            count,
            earnings: count * 50 // Assumes 50 Birr per referral
        };
    }

    async getAllUsers(): Promise<UserData[]> {
        return Array.from(this.users.values());
    }
}

export const userService = new UserService();
export type { UserData };
