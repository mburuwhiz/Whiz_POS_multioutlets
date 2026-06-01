export interface LegacyBackupData {
  version: string;
  business?: any;
  products?: any[];
  categories?: any[];
  users?: any[];
  transactions?: any[];
  customers?: any[];
  suppliers?: any[];
  settings?: any;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  migratedData?: any;
  logs: string[];
}

export class BackupMigrationService {
  private logs: string[] = [];

  log(message: string) {
    const timestamp = new Date().toISOString();
    this.logs.push(`[${timestamp}] ${message}`);
    console.log(`[BackupMigration] ${message}`);
  }

  async validateBackup(backupData: LegacyBackupData): Promise<boolean> {
    this.log('Validating backup integrity...');
    
    if (!backupData) {
      this.log('❌ Backup data is empty');
      return false;
    }

    if (!backupData.business && !backupData.products && !backupData.users) {
      this.log('⚠️ Backup appears to be missing core data');
    }

    this.log('✅ Backup validation complete');
    return true;
  }

  async migrateBackup(backupData: LegacyBackupData): Promise<MigrationResult> {
    this.logs = [];
    this.log('🚀 Starting backup migration...');

    try {
      const isValid = await this.validateBackup(backupData);
      if (!isValid) {
        return {
          success: false,
          message: 'Backup validation failed',
          logs: this.logs
        };
      }

      this.log('Transforming legacy schema to Version 8.0.0...');

      const migratedData = {
        businessSetup: this.migrateBusinessSetup(backupData),
        products: this.migrateProducts(backupData),
        users: this.migrateUsers(backupData),
        transactions: this.migrateTransactions(backupData),
        customers: backupData.customers || [],
        suppliers: backupData.suppliers || []
      };

      this.log('✅ Migration complete!');
      
      return {
        success: true,
        message: 'Backup migrated successfully',
        migratedData,
        logs: this.logs
      };
    } catch (error) {
      this.log(`❌ Migration failed: ${error}`);
      return {
        success: false,
        message: `Migration failed: ${error}`,
        logs: this.logs
      };
    }
  }

  private migrateBusinessSetup(backupData: LegacyBackupData): any {
    this.log('Migrating business profile...');
    
    const legacyBusiness = backupData.business || backupData.settings || {};
    
    return {
      isSetup: true,
      status: 'completed',
      businessName: legacyBusiness.businessName || legacyBusiness.name || 'My Business',
      email: legacyBusiness.email || '',
      phone: legacyBusiness.phone || '',
      address: legacyBusiness.address || '',
      currency: legacyBusiness.currency || 'KES',
      taxRate: legacyBusiness.taxRate || 16,
      taxName: legacyBusiness.taxName || 'VAT',
      receiptHeader: legacyBusiness.receiptHeader || '',
      receiptFooter: legacyBusiness.receiptFooter || '',
      showLogoOnReceipt: legacyBusiness.showLogoOnReceipt !== false,
      createdAt: new Date().toISOString()
    };
  }

  private migrateProducts(backupData: LegacyBackupData): any[] {
    this.log('Migrating products...');
    
    const legacyProducts = backupData.products || [];
    
    return legacyProducts.map((product: any) => ({
      id: product.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: product.name,
      category: product.category || '',
      price: product.price || 0,
      cost: product.cost || 0,
      stock: product.stock || product.quantity || 0,
      barcode: product.barcode || '',
      image: product.image || '',
      createdAt: product.createdAt || new Date().toISOString()
    }));
  }

  private migrateUsers(backupData: LegacyBackupData): any[] {
    this.log('Migrating users and roles...');
    
    const legacyUsers = backupData.users || [];
    
    return legacyUsers.map((user: any) => ({
      id: user.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: user.name || user.username,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'cashier',
      pin: user.pin || '',
      active: user.active !== false,
      lastLogin: user.lastLogin || null,
      createdAt: user.createdAt || new Date().toISOString()
    }));
  }

  private migrateTransactions(backupData: LegacyBackupData): any[] {
    this.log('Migrating transactions...');
    
    const legacyTransactions = backupData.transactions || [];
    
    return legacyTransactions.map((tx: any) => ({
      id: tx.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      items: tx.items || [],
      total: tx.total || 0,
      paymentMethod: tx.paymentMethod || 'cash',
      cashierName: tx.cashierName || tx.cashier || 'Unknown',
      createdAt: tx.createdAt || tx.date || new Date().toISOString()
    }));
  }
}

export const backupMigrationService = new BackupMigrationService();
