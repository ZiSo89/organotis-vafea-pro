/**
 * Settings Service - Διαχείριση Ρυθμίσεων
 * Centralized settings management using database
 */

window.SettingsService = {
    isElectron() {
      return (
        typeof window.electronAPI !== 'undefined' &&
        typeof window.electronAPI.db !== 'undefined'
      );
    },
  cache: {},
  loaded: false,

  /**
   * Load all settings from database
   */
  async loadAll() {
    console.log('[SettingsService] Loading all settings...');
    if (this.isElectron()) {
      try {
        const result = await window.electronAPI.db.getAll('settings');
        if (result && result.success) {
          // SQLite: settings table should have setting_key/setting_value pairs
          const settingsObj = {};
          (result.data || []).forEach(row => {
            let value = row.settingValue;
            console.log('[SettingsService] Raw setting:', row.settingKey, '=', value, 'type:', typeof value);
            
            // Parse JSON strings back to objects
            if (typeof value === 'string') {
              // Try to parse as JSON
              try {
                const parsed = JSON.parse(value);
                console.log('[SettingsService] Parsed', row.settingKey, 'to:', parsed);
                value = parsed;
              } catch (e) {
                // Not JSON, keep as string
                console.log('[SettingsService] Keeping', row.settingKey, 'as string');
              }
            }
            settingsObj[row.settingKey] = value;
          });
          this.cache = settingsObj;
          this.loaded = true;
          console.log('[SettingsService] Loaded settings (Electron):', this.cache);
          return this.cache;
        } else {
          console.error('[SettingsService] Failed to load settings (Electron):', result && result.message);
          return {};
        }
      } catch (error) {
        console.error('[SettingsService] Error loading settings (Electron):', error);
        return {};
      }
    } else {
      try {
        const response = await fetch('/api/settings.php');
        const result = await response.json();
        if (result.success) {
          this.cache = result.data || {};
          this.loaded = true;
          console.log('[SettingsService] Loaded settings:', this.cache);
          return this.cache;
        } else {
          console.error('[SettingsService] Failed to load settings:', result.message);
          return {};
        }
      } catch (error) {
        console.error('[SettingsService] Error loading settings:', error);
        return {};
      }
    }
  },

  /**
   * Get a setting value by key
   */
  async get(key, defaultValue = null) {
    console.log('[SettingsService] Getting setting:', key);
    
    // Load settings if not loaded
    if (!this.loaded) {
      await this.loadAll();
    }
    let value = this.cache[key];
    // Αν είσαι Electron και δεν υπάρχει το key, δοκίμασε να το πάρεις απευθείας από SQLite
    if (this.isElectron() && value === undefined) {
      try {
        const sql = 'SELECT setting_value FROM settings WHERE setting_key = ?';
        const result = await window.electronAPI.db.query(sql, [key]);
        if (result && result.success && result.data && result.data.length > 0) {
          value = result.data[0].settingValue;
        }
      } catch (error) {
        console.error('[SettingsService] Error getting setting from Electron:', error);
      }
    }
    const result = value !== undefined ? value : defaultValue;
    console.log('[SettingsService] Setting value for', key, ':', result);
    return result;
  },

  /**
   * Set a setting value
   */
  async set(key, value) {
    console.log('[SettingsService] Setting:', key, '=', value);
    if (this.isElectron()) {
      try {
        // Get all settings to find if it exists
        const allSettingsResult = await window.electronAPI.db.getAll('settings');
        const allSettings = allSettingsResult.success ? allSettingsResult.data : [];
        const existing = allSettings.find(s => s.settingKey === key);
        
        if (existing) {
          // Update existing setting
          const result = await window.electronAPI.db.update('settings', existing.id, {
            settingKey: key,
            settingValue: typeof value === 'object' ? JSON.stringify(value) : value
          });
          console.log('[SettingsService] Update result:', result);
        } else {
          // Insert new setting
          const result = await window.electronAPI.db.insert('settings', {
            settingKey: key,
            settingValue: typeof value === 'object' ? JSON.stringify(value) : value
          });
          console.log('[SettingsService] Insert result:', result);
        }
        
        this.cache[key] = value;
        console.log('[SettingsService] Setting saved successfully (Electron)');
        return true;
      } catch (error) {
        console.error('[SettingsService] Error saving setting (Electron):', error);
        return false;
      }
    } else {
      try {
        const response = await fetch('/api/settings.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value })
        });
        const result = await response.json();
        if (result.success) {
          this.cache[key] = value;
          console.log('[SettingsService] Setting saved successfully');
          return true;
        } else {
          console.error('[SettingsService] Failed to save setting:', result.message);
          return false;
        }
      } catch (error) {
        console.error('[SettingsService] Error saving setting:', error);
        return false;
      }
    }
  },

  /**
   * Delete a setting
   */
  async delete(key) {
    console.log('[SettingsService] Deleting setting:', key);
    if (this.isElectron()) {
      try {
        const sql = 'DELETE FROM settings WHERE setting_key = ?';
        const result = await window.electronAPI.db.query(sql, [key]);
        if (result) {
          delete this.cache[key];
          console.log('[SettingsService] Setting deleted successfully (Electron)');
          return true;
        } else {
          console.error('[SettingsService] Failed to delete setting (Electron)');
          return false;
        }
      } catch (error) {
        console.error('[SettingsService] Error deleting setting (Electron):', error);
        return false;
      }
    } else {
      try {
        const response = await fetch(`/api/settings.php?key=${key}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
          delete this.cache[key];
          console.log('[SettingsService] Setting deleted successfully');
          return true;
        } else {
          console.error('[SettingsService] Failed to delete setting:', result.message);
          return false;
        }
      } catch (error) {
        console.error('[SettingsService] Error deleting setting:', error);
        return false;
      }
    }
  },

  /**
   * Get pricing settings
   */
  async getPricing() {
    console.log('[SettingsService] Getting pricing settings');
    const pricing = await this.get('pricing_settings', {
      hourlyRate: 50,
      vat: 24,
      travelCost: 0.5
    });
    return pricing;
  },

  /**
   * Save pricing settings
   */
  async savePricing(pricingData) {
    console.log('[SettingsService] Saving pricing settings:', pricingData);
    return await this.set('pricing_settings', pricingData);
  }
};
