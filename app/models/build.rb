class Build < ActiveRecord::Base
  has_many :apps

  def short_name
    name.gsub(".", "").gsub("-", "")
  end

  def self.default
    find_by(platform: 'ios', name: "0.13.0-rc")
  end

end
