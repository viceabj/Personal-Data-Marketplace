import { describe, it, expect, beforeEach, vi } from 'vitest';

const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

// Mock contract state
let dataUsage: { [key: string]: number } = {};

// Mock contract functions
const mockContractCall = vi.fn((functionName: string, args: any[], sender: string) => {
  switch (functionName) {
    case 'record-data-usage':
      const [vaultId, user] = args;
      if (sender !== contractOwner) {
        return { success: false, error: 100 }; // err-not-authorized
      }
      const key = `${vaultId}-${user}`;
      dataUsage[key] = (dataUsage[key] || 0) + 1;
      return { success: true };
    case 'get-data-usage':
      const [getVaultId, getUser] = args;
      const getKey = `${getVaultId}-${getUser}`;
      return { success: true, value: dataUsage[getKey] || 0 };
    case 'reset-data-usage':
      const [resetVaultId, resetUser] = args;
      const resetKey = `${resetVaultId}-${resetUser}`;
      if (sender !== contractOwner) {
        return { success: false, error: 100 }; // err-not-authorized
      }
      dataUsage[resetKey] = 0;
      return { success: true };
    default:
      return { success: false, error: 'Unknown function' };
  }
});

describe('Data Usage Tracker Contract', () => {
  const user1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const user2 = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
  
  beforeEach(() => {
    dataUsage = {};
    mockContractCall.mockClear();
  });
  
  describe('record-data-usage', () => {
    it('should record data usage when called by contract owner', () => {
      const result = mockContractCall('record-data-usage', [1, user1], contractOwner);
      expect(result.success).toBe(true);
    });
    
    it('should fail when called by non-owner', () => {
      const result = mockContractCall('record-data-usage', [1, user1], user1);
      expect(result.success).toBe(false);
      expect(result.error).toBe(100); // err-not-authorized
    });
    
    it('should increment data usage for multiple calls', () => {
      mockContractCall('record-data-usage', [1, user1], contractOwner);
      mockContractCall('record-data-usage', [1, user1], contractOwner);
      const result = mockContractCall('get-data-usage', [1, user1], user1);
      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });
  });
  
  describe('get-data-usage', () => {
    it('should return correct data usage for a user', () => {
      mockContractCall('record-data-usage', [1, user1], contractOwner);
      mockContractCall('record-data-usage', [1, user1], contractOwner);
      const result = mockContractCall('get-data-usage', [1, user1], user1);
      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });
    
    it('should return 0 for user with no recorded usage', () => {
      const result = mockContractCall('get-data-usage', [1, user2], user2);
      expect(result.success).toBe(true);
      expect(result.value).toBe(0);
    });
  });
  
  describe('reset-data-usage', () => {
    it('should reset data usage when called by contract owner', () => {
      mockContractCall('record-data-usage', [1, user1], contractOwner);
      mockContractCall('record-data-usage', [1, user1], contractOwner);
      const resetResult = mockContractCall('reset-data-usage', [1, user1], contractOwner);
      expect(resetResult.success).toBe(true);
      
      const getResult = mockContractCall('get-data-usage', [1, user1], user1);
      expect(getResult.success).toBe(true);
      expect(getResult.value).toBe(0);
    });
    
    it('should fail when called by non-owner', () => {
      const result = mockContractCall('reset-data-usage', [1, user1], user1);
      expect(result.success).toBe(false);
      expect(result.error).toBe(100); // err-not-authorized
    });
  });
});

