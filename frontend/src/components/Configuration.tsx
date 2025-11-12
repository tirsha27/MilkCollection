import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Save, AlertCircle, Plus, Trash2, Check } from 'lucide-react';

interface ConfigItem {
  id: string;
  config_key: string;
  config_value: any;
  description: string | null;
}

interface ConfigOption {
  id: string;
  config_key: string;
  option_value: string;
  option_label: string;
  is_default: boolean | null;
  display_order: number | null;
}

export default function Configuration() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [options, setOptions] = useState<Record<string, ConfigOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showAddOptionForm, setShowAddOptionForm] = useState<string | null>(null);
  const [newOption, setNewOption] = useState({
    option_value: '',
    option_label: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [configRes, optionsRes] = await Promise.all([
        supabase.from('system_config').select('*').order('config_key'),
        supabase.from('system_config_options').select('*').order('display_order')
      ]);

      if (configRes.error) throw configRes.error;
      if (optionsRes.error) throw optionsRes.error;

      const configData = configRes.data || [];
      setConfigs(configData);

      const initialFormData: Record<string, string> = {};
      configData.forEach((config) => {
        initialFormData[config.config_key] = String(config.config_value);
      });
      setFormData(initialFormData);

      const optionsMap: Record<string, ConfigOption[]> = {};
      (optionsRes.data || []).forEach((option) => {
        if (!optionsMap[option.config_key]) {
          optionsMap[option.config_key] = [];
        }
        optionsMap[option.config_key].push(option);
      });
      setOptions(optionsMap);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');

    try {
      const updates = configs.map((config) => ({
        id: config.id,
        config_value: formData[config.config_key],
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('system_config')
          .update({ config_value: update.config_value, updated_at: update.updated_at })
          .eq('id', update.id);

        if (error) throw error;
      }

      setSuccessMessage('Configuration saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOption = async (e: React.FormEvent, configKey: string) => {
    e.preventDefault();

    if (!newOption.option_value.trim() || !newOption.option_label.trim()) {
      alert('Both value and label are required');
      return;
    }

    try {
      const maxOrder = options[configKey]?.length || 0;

      const { error } = await supabase
        .from('system_config_options')
        .insert([{
          config_key: configKey,
          option_value: newOption.option_value,
          option_label: newOption.option_label,
          is_default: false,
          display_order: maxOrder + 1,
        }]);

      if (error) throw error;

      setNewOption({ option_value: '', option_label: '' });
      setShowAddOptionForm(null);
      loadConfig();
      setSuccessMessage('Option added successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error adding option:', error);
      alert(error.message || 'Failed to add option');
    }
  };

  const handleDeleteOption = async (optionId: string, configKey: string) => {
    if (!confirm('Are you sure you want to delete this option?')) return;

    try {
      const { error } = await supabase
        .from('system_config_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;

      loadConfig();
      setSuccessMessage('Option deleted');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting option:', error);
      alert('Failed to delete option');
    }
  };

  const handleSetDefault = async (optionId: string, configKey: string, optionValue: string) => {
    try {
      await supabase
        .from('system_config_options')
        .update({ is_default: false })
        .eq('config_key', configKey);

      const { error } = await supabase
        .from('system_config_options')
        .update({ is_default: true })
        .eq('id', optionId);

      if (error) throw error;

      await supabase
        .from('system_config')
        .update({ config_value: optionValue, updated_at: new Date().toISOString() })
        .eq('config_key', configKey);

      loadConfig();
      setSuccessMessage('Default option updated');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error setting default:', error);
      alert('Failed to set default option');
    }
  };

  const getConfigLabel = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return <div className="text-center py-12">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Configuration</h2>
        <p className="text-slate-600 mt-1">Manage system parameters with preset values</p>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg border border-green-200">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-2">Configuration Parameters</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              Each parameter has multiple preset values to choose from. Select a value by clicking on it,
              or add custom values using the "Add Value" button. Default values are marked with a checkmark.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {configs.map((config) => {
          const configOptions = options[config.config_key] || [];
          const currentValue = formData[config.config_key];

          return (
            <div key={config.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {getConfigLabel(config.config_key)}
                  </h3>
                  {config.description && (
                    <p className="text-sm text-slate-600 mt-1">{config.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddOptionForm(config.config_key)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Value
                </button>
              </div>

              {showAddOptionForm === config.config_key && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <form onSubmit={(e) => handleAddOption(e, config.config_key)} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Value *
                        </label>
                        <input
                          type="text"
                          value={newOption.option_value}
                          onChange={(e) => setNewOption({ ...newOption, option_value: e.target.value })}
                          placeholder="e.g., 250"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Label *
                        </label>
                        <input
                          type="text"
                          value={newOption.option_label}
                          onChange={(e) => setNewOption({ ...newOption, option_label: e.target.value })}
                          placeholder="e.g., 250 km"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddOptionForm(null);
                          setNewOption({ option_value: '', option_label: '' });
                        }}
                        className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Available Values:</p>
                {configOptions.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No preset values. Click "Add Value" to add one.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {configOptions.map((option) => (
                      <div
                        key={option.id}
                        className={`group relative p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          currentValue === option.option_value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                        onClick={() => setFormData({ ...formData, [config.config_key]: option.option_value })}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900">{option.option_label}</div>
                            <div className="text-xs text-slate-500 mt-1">Value: {option.option_value}</div>
                          </div>
                          {option.is_default && (
                            <Check className="h-4 w-4 text-green-600 flex-shrink-0" title="Default" />
                          )}
                        </div>

                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          {!option.is_default && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(option.id, config.config_key, option.option_value);
                              }}
                              className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              title="Set as default"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOption(option.id, config.config_key);
                            }}
                            className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">Selected:</span>{' '}
                    <span className="text-blue-600">{currentValue || 'None'}</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Saving...' : 'Save All Configuration'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">How to Use</h3>
        <div className="space-y-3 text-sm text-slate-700">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">1</div>
            <p>Click on any value card to select it as the current configuration</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">2</div>
            <p>Click "Add Value" to add custom preset values for each parameter</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">3</div>
            <p>Hover over a value card to see options: set as default (checkmark) or delete (trash)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">4</div>
            <p>Click "Save All Configuration" to apply your selected values</p>
          </div>
        </div>
      </div>
    </div>
  );
}
