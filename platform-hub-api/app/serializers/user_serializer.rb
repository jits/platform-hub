class UserSerializer < ActiveModel::Serializer
  attributes :id, :name, :email, :role, :last_seen_at

  has_many :identities, if: :is_admin_or_own?

  attribute :enabled_identities do
    object.identities.pluck(:provider)
  end

  has_one :flags, if: :is_admin_or_own?, serializer: UserFlagsSerializer do
    object.ensure_flags
  end

  attributes :is_managerial, :is_technical

  # Note: `scope` here is actually `current_user` (passed in from controller)
  def is_admin_or_own?
    scope.admin? || scope.id == object.id
  end
end
