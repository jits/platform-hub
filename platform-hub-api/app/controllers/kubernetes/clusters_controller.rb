class Kubernetes::ClustersController < ApiJsonController

  before_action :load_kubernetes_clusters_hash_record

  # GET /kubernetes/clusters
  def index
    authorize! :read, :kubernetes_clusters
    clusters = @kubernetes_clusters.data.map do |c|
      c.with_indifferent_access.slice(:id, :description)
    end.sort_by! do |c|
      c[:id]
    end
    render json: clusters
  end

  # PATCH/PUT /kubernetes/clusters/:id
  def create_or_update
    authorize! :manage, :kubernetes_clusters

    data = cluster_params.to_h
    data[:id] = params[:id]  # ID in URL takes precedence

    Kubernetes::ClusterService.create_or_update data

    AuditService.log(
      context: audit_context,
      action: 'update_kubernetes_cluster',
      data: { id: params[:id] },
      comment: "Kubernetes cluster '#{params[:id]}' created or updated by #{current_user.email}"
    )

    head :no_content
  end

  private

  def load_kubernetes_clusters_hash_record
    @kubernetes_clusters = Kubernetes::ClusterService.clusters_config_hash_record
  end

  def cluster_params
    params.require(:cluster).permit(
      :id,
      :description,
      :s3_region,
      :s3_bucket_name,
      :s3_access_key_id,
      :s3_secret_access_key,
      :object_key
    )
  end

end
