/**
 * Settings Service - Διαχείριση Ρυθμίσεων
 * Centralized settings management using database
 */

window.SettingsService = {
  cache: {},
  loaded: false,

  /**
   * Load all settings from database
   */
  async loadAll() {
    console.log('[SettingsService] Loading all settings...');
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
    
    const value = this.cache[key];
    const result = value !== undefined ? value : defaultValue;
    console.log('[SettingsService] Setting value for', key, ':', result);
    return result;
  },

  /**
   * Set a setting value
   */
  async set(key, value) {
    console.log('[SettingsService] Setting:', key, '=', value);
    
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
  },

  /**
   * Delete a setting
   */
  async delete(key) {
    console.log('[SettingsService] Deleting setting:', key);
    
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
