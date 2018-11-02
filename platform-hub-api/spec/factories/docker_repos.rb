FactoryGirl.define do
  factory :docker_repo do
    id { SecureRandom.uuid }
    sequence :name do |n|
      "repo#{n}"
    end
    service
    status :pending
  end
end
