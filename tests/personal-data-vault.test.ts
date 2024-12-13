import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock contract state
let vaults: { [key: number]: any } = {};
let dataAccess: { [key: string]: boolean } = {};
let nextVaultId = 1;

// Mock contract functions
const mockContractCall = vi.fn((functionName: string, args: any[], sender: string) => {
  switch (functionName) {
    case 'create-vault':
      const [encryptedData, price] = args;
      const vaultId = nextVaultId++;
      vaults[vaultId] = { owner: sender, encrypted_data: encryptedData, price: price };
      return { success: true, value: vaultId };
    case 'update-vault-data':
      const [updateVaultId, newEncryptedData] = args;
      if (!vaults[updateVaultId] || vaults[updateVaultId].owner !== sender) {
        return { success: false, error: 100 }; // err-not-owner
      }
      vaults[updateVaultId].encrypted_data = newEncryptedData;
      return { success: true };
    case 'update-vault-price':
      const [priceVaultId, newPrice] = args;
      if (!vaults[priceVaultId] || vaults[priceVaultId].owner !== sender) {
        return { success: false, error: 100 }; // err-not-owner
      }
      vaults[priceVaultId].price = newPrice;
      return { success: true };
    case 'purchase-data-access':
      const [purchaseVaultId] = args;
      if (!vaults[purchaseVaultId]) {
        return { success: false, error: 101 }; // err-vault-not-found
      }
      dataAccess[`${purchaseVaultId}-${sender}`] = true;
      return { success: true };
    case 'get-vault-data':
      const [getVaultId] = args;
      if (!vaults[getVaultId]) {
        return { success: false, error: 101 }; // err-vault-not-found
      }
      if (vaults[getVaultId].owner !== sender && !dataAccess[`${getVaultId}-${sender}`]) {
        return { success: false, error: 103 }; // err-no-access
      }
      return { success: true, value: vaults[getVaultId].encrypted_data };
    case 'get-vault-price':
      const [priceGetVaultId] = args;
      if (!vaults[priceGetVaultId]) {
        return { success: false, error: 101 }; // err-vault-not-found
      }
      return { success: true, value: vaults[priceGetVaultId].price };
    case 'check-data-access':
      const [checkVaultId, checkUser] = args;
      return { success: true, value: !!dataAccess[`${checkVaultId}-${checkUser}`] };
    default:
      return { success: false, error: 'Unknown function' };
  }
});

describe('Personal Data Vault Contract', () => {
  const owner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const user1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const user2 = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
  
  beforeEach(() => {
    vaults = {};
    dataAccess = {};
    nextVaultId = 1;
    mockContractCall.mockClear();
  });
  
  describe('create-vault', () => {
    it('should create a new vault', () => {
      const result = mockContractCall('create-vault', ['encrypted-data', 100], owner);
      expect(result.success).toBe(true);
      expect(result.value).toBe(1);
    });
  });
  
  describe('update-vault-data', () => {
    it('should update vault data when called by owner', () => {
      mockContractCall('create-vault', ['old-data', 100], owner);
      const result = mockContractCall('update-vault-data', [1, 'new-data'], owner);
      expect(result.success).toBe(true);
    });
    
    it('should fail when called by non-owner', () => {
      mockContractCall('create-vault', ['old-data', 100], owner);
      const result = mockContractCall('update-vault-data', [1, 'new-data'], user1);
      expect(result.success).toBe(false);
      expect(result.error).toBe(100); // err-not-owner
    });
  });
  
  describe('update-vault-price', () => {
    it('should update vault price when called by owner', () => {
      mockContractCall('create-vault', ['data', 100], owner);
      const result = mockContractCall('update-vault-price', [1, 200], owner);
      expect(result.success).toBe(true);
    });
    
    it('should fail when called by non-owner', () => {
      mockContractCall('create-vault', ['data', 100], owner);
      const result = mockContractCall('update-vault-price', [1, 200], user1);
      expect(result.success).toBe(false);
      expect(result.error).toBe(100); // err-not-owner
    });
  });
  
  describe('purchase-data-access', () => {
    it('should grant access to the vault', () => {
      mockContractCall('create-vault', ['data', 100], owner);
      const result = mockContractCall('purchase-data-access', [1], user1);
      expect(result.success).toBe(true);
    });
    
    it('should fail for non-existent vault', () => {
      const result = mockContractCall('purchase-data-access', [999], user1);
      expect(result.success).toBe(false);
      expect(result.error).toBe(101); // err-vault-not-found
    });
  });
  
  describe('get-vault-data', () => {
    it('should return data for vault owner', () => {
      mockContractCall('create-vault', ['secret-data', 100], owner);
      const result = mockContractCall('get-vault-data', [1], owner);
      expect(result.success).toBe(true);
      expect(result.value).toBe('secret-data');
    });
    
    it('should return data for user with access', () => {
      mockContractCall('create-vault', ['secret-data', 100], owner);
      mockContractCall('purchase-data-access', [1], user1);
      const result = mockContractCall('get-vault-data', [1], user1);
      expect(result.success).toBe(true);
      expect(result.value).toBe('secret-data');
    });
    
    it('should fail for user without access', () => {
      mockContractCall('create-vault', ['secret-data', 100], owner);
      const result = mockContractCall('get-vault-data', [1], user2);
      expect(result.success).toBe(false);
      expect(result.error).toBe(103); // err-no-access
    });
  });
  
  describe('get-vault-price', () => {
    it('should return the correct price for a vault', () => {
      mockContractCall('create-vault', ['data', 100], owner);
      const result = mockContractCall('get-vault-price', [1]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(100);
    });
    
    it('should fail for non-existent vault', () => {
      const result = mockContractCall('get-vault-price', [999]);
      expect(result.success).toBe(false);
      expect(result.error).toBe(101); // err-vault-not-found
    });
  });
  
  describe('check-data-access', () => {
    it('should return true for user with access', () => {
      mockContractCall('create-vault', ['data', 100], owner);
      mockContractCall('purchase-data-access', [1], user1);
      const result = mockContractCall('check-data-access', [1, user1]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(true);
    });
    
    it('should return false for user without access', () => {
      mockContractCall('create-vault', ['data', 100], owner);
      const result = mockContractCall('check-data-access', [1, user2]);
      expect(result.success).toBe(true);
      expect(result.value).toBe(false);
    });
  });
});
